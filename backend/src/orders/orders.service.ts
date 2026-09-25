import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';
import { FoodsService } from '../foods/foods.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { OrderDetailResponseDto } from './dto/order-detail-response.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { PaginatedOrdersResponseDto } from './dto/paginated-orders-response.dto';
import {
  ACCEPTED_STATUS,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  IN_PROGRESS_STATUSES,
  INITIAL_STATUS,
  MAX_PAGE_SIZE,
  ORDER_CONFLICT_CODES,
  RECEIVED_STATUS,
  REJECTED_STATUS,
} from './orders.constants';

const MAX_ORDERS_IN_PROGRESS = 10;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly foodsService: FoodsService,
  ) {}

  async create(userId: number, dto: CreateOrderDto): Promise<OrderResponseDto> {
    const beneficiaryEntity = await this.prisma.beneficiaryEntity.findUnique({ where: { userId } });
    if (!beneficiaryEntity) {
      throw new NotFoundException('Beneficiary entity not found.');
    }

    const ordersInProgress = await this.prisma.order.count({
      where: this.inProgressWhere(beneficiaryEntity.id),
    });
    if (ordersInProgress >= MAX_ORDERS_IN_PROGRESS) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: 'Beneficiary entity has reached the limit of orders in progress.',
        code: ORDER_CONFLICT_CODES.limitReached,
      });
    }

    const food = await this.foodsService.findAvailableById(dto.foodId);
    if (!food) {
      throw new NotFoundException('Food not found.');
    }

    const duplicate = await this.prisma.order.findFirst({
      where: { ...this.inProgressWhere(beneficiaryEntity.id), foodId: food.id },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: 'Beneficiary entity already has an order in progress for this food.',
        code: ORDER_CONFLICT_CODES.duplicateInProgress,
      });
    }

    if (new Prisma.Decimal(dto.quantity).greaterThan(food.quantity)) {
      throw new BadRequestException('Requested quantity exceeds the available amount.');
    }

    const status = await this.prisma.orderStatus.findUniqueOrThrow({
      where: { name: INITIAL_STATUS },
    });

    const order = await this.prisma.order.create({
      data: {
        quantity: dto.quantity,
        foodId: food.id,
        statusId: status.id,
        establishmentId: food.establishmentId,
        beneficiaryEntityId: beneficiaryEntity.id,
      },
      include: { status: true, food: true, establishment: true, beneficiaryEntity: true },
    });

    return this.toResponse(order);
  }

  async accept(userId: number, orderId: number): Promise<OrderResponseDto> {
    const establishment = await this.prisma.establishment.findUnique({ where: { userId } });
    if (!establishment) {
      throw new NotFoundException('Establishment not found.');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, establishmentId: establishment.id, deleted: false },
    });
    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    const [pending, accepted] = await Promise.all([
      this.prisma.orderStatus.findUniqueOrThrow({ where: { name: INITIAL_STATUS } }),
      this.prisma.orderStatus.findUniqueOrThrow({ where: { name: ACCEPTED_STATUS } }),
    ]);
    if (order.statusId !== pending.id) {
      throw new ConflictException('Order is not pending.');
    }

    const food = await this.foodsService.findAvailableById(order.foodId);
    if (!food) {
      throw new ConflictException('Linked food is no longer available.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Conditional update as a compare-and-swap: a concurrent accept sees count 0 here.
      const moved = await tx.order.updateMany({
        where: { id: order.id, statusId: pending.id },
        data: { statusId: accepted.id },
      });
      if (moved.count === 0) {
        throw new ConflictException('Order is not pending.');
      }

      const reserved = await tx.food.updateMany({
        where: { id: order.foodId, quantity: { gte: order.quantity } },
        data: { quantity: { decrement: order.quantity } },
      });
      if (reserved.count === 0) {
        throw new ConflictException('Insufficient food quantity to accept this order.');
      }

      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: { status: true, food: true, establishment: true, beneficiaryEntity: true },
      });
    });

    return this.toResponse(updated);
  }

  async reject(userId: number, orderId: number): Promise<OrderResponseDto> {
    const establishment = await this.prisma.establishment.findUnique({ where: { userId } });
    if (!establishment) {
      throw new NotFoundException('Establishment not found.');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, establishmentId: establishment.id, deleted: false },
    });
    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    const [pending, rejected] = await Promise.all([
      this.prisma.orderStatus.findUniqueOrThrow({ where: { name: INITIAL_STATUS } }),
      this.prisma.orderStatus.findUniqueOrThrow({ where: { name: REJECTED_STATUS } }),
    ]);
    if (order.statusId !== pending.id) {
      throw new ConflictException('Order is not pending.');
    }

    // Conditional update as a compare-and-swap: a concurrent accept/reject sees count 0 here.
    const moved = await this.prisma.order.updateMany({
      where: { id: order.id, statusId: pending.id },
      data: { statusId: rejected.id },
    });
    if (moved.count === 0) {
      throw new ConflictException('Order is not pending.');
    }

    const updated = await this.prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { status: true, food: true, establishment: true, beneficiaryEntity: true },
    });

    return this.toResponse(updated);
  }

  async receive(userId: number, orderId: number): Promise<OrderResponseDto> {
    const beneficiaryEntity = await this.prisma.beneficiaryEntity.findUnique({ where: { userId } });
    if (!beneficiaryEntity) {
      throw new NotFoundException('Beneficiary entity not found.');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, beneficiaryEntityId: beneficiaryEntity.id, deleted: false },
    });
    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    const [accepted, received] = await Promise.all([
      this.prisma.orderStatus.findUniqueOrThrow({ where: { name: ACCEPTED_STATUS } }),
      this.prisma.orderStatus.findUniqueOrThrow({ where: { name: RECEIVED_STATUS } }),
    ]);
    if (order.statusId !== accepted.id) {
      throw new ConflictException('Order is not accepted.');
    }

    // Conditional update as a compare-and-swap: a concurrent confirmation sees count 0 here.
    const moved = await this.prisma.order.updateMany({
      where: { id: order.id, statusId: accepted.id },
      data: { statusId: received.id },
    });
    if (moved.count === 0) {
      throw new ConflictException('Order is not accepted.');
    }

    const updated = await this.prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { status: true, food: true, establishment: true, beneficiaryEntity: true },
    });

    return this.toResponse(updated);
  }

  async list(userId: number, query: ListOrdersQueryDto): Promise<PaginatedOrdersResponseDto> {
    const establishment = await this.prisma.establishment.findUnique({ where: { userId } });
    const beneficiaryEntity = establishment
      ? null
      : await this.prisma.beneficiaryEntity.findUnique({ where: { userId } });

    if (!establishment && !beneficiaryEntity) {
      throw new NotFoundException('No establishment or beneficiary entity linked to this account.');
    }

    const where: Prisma.OrderWhereInput = {
      deleted: false,
      ...(establishment
        ? { establishmentId: establishment.id }
        : { beneficiaryEntityId: beneficiaryEntity!.id }),
      ...(query.status ? { status: { name: query.status } } : {}),
    };

    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = Math.min(query.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { status: true, food: true, establishment: true, beneficiaryEntity: true },
        orderBy: { orderDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data: rows.map((row) => this.toResponse(row)), total, page, pageSize };
  }

  async getById(userId: number, orderId: number): Promise<OrderDetailResponseDto> {
    const establishment = await this.prisma.establishment.findUnique({ where: { userId } });
    const beneficiaryEntity = establishment
      ? null
      : await this.prisma.beneficiaryEntity.findUnique({ where: { userId } });

    if (!establishment && !beneficiaryEntity) {
      throw new NotFoundException('Order not found.');
    }

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        deleted: false,
        ...(establishment
          ? { establishmentId: establishment.id }
          : { beneficiaryEntityId: beneficiaryEntity!.id }),
      },
      include: {
        status: true,
        food: { include: { category: true, status: true } },
        establishment: { include: { address: true } },
        beneficiaryEntity: { include: { address: true } },
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return this.toDetailResponse(order);
  }

  private inProgressWhere(beneficiaryEntityId: number): Prisma.OrderWhereInput {
    return {
      beneficiaryEntityId,
      deleted: false,
      status: { name: { in: IN_PROGRESS_STATUSES } },
    };
  }

  private mapInstitution(inst: {
    id: number;
    companyName: string;
    tradeName: string | null;
    description: string;
    address: { city: string; state: string };
  }) {
    return {
      id: inst.id,
      companyName: inst.companyName,
      tradeName: inst.tradeName,
      description: inst.description,
      city: inst.address.city,
      state: inst.address.state,
    };
  }

  private toDetailResponse(
    order: Prisma.OrderGetPayload<{
      include: {
        status: true;
        food: { include: { category: true; status: true } };
        establishment: { include: { address: true } };
        beneficiaryEntity: { include: { address: true } };
      };
    }>,
  ): OrderDetailResponseDto {
    return {
      id: order.id,
      quantity: order.quantity.toString(),
      orderDate: order.orderDate,
      status: { id: order.status.id, name: order.status.name },
      food: {
        id: order.food.id,
        image: order.food.image,
        name: order.food.name,
        quantity: order.food.quantity.toString(),
        quantityUnit: order.food.quantityUnit,
        description: order.food.description,
        expirationDate: order.food.expirationDate,
        category: { id: order.food.category.id, name: order.food.category.name },
        status: { id: order.food.status.id, name: order.food.status.name },
      },
      establishment: this.mapInstitution(order.establishment),
      beneficiaryEntity: this.mapInstitution(order.beneficiaryEntity),
    };
  }

  private toResponse(
    order: Prisma.OrderGetPayload<{
      include: { status: true; food: true; establishment: true; beneficiaryEntity: true };
    }>,
  ): OrderResponseDto {
    return {
      id: order.id,
      quantity: order.quantity.toString(),
      orderDate: order.orderDate,
      status: { id: order.status.id, name: order.status.name },
      food: { id: order.food.id, name: order.food.name, quantityUnit: order.food.quantityUnit },
      establishment: {
        id: order.establishment.id,
        companyName: order.establishment.companyName,
      },
      beneficiaryEntity: {
        id: order.beneficiaryEntity.id,
        companyName: order.beneficiaryEntity.companyName,
      },
    };
  }
}
