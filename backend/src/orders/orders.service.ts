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
import { OrderResponseDto } from './dto/order-response.dto';

const INITIAL_STATUS = 'Pendente';
const ACCEPTED_STATUS = 'Aceito';
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

    // No status filter: "Pendente" and "Aceito" are both in progress; RF17/RF18 add terminal ones to exclude.
    const ordersInProgress = await this.prisma.order.count({
      where: { beneficiaryEntityId: beneficiaryEntity.id, deleted: false },
    });
    if (ordersInProgress >= MAX_ORDERS_IN_PROGRESS) {
      throw new ConflictException(
        'Beneficiary entity has reached the limit of orders in progress.',
      );
    }

    const food = await this.foodsService.findAvailableById(dto.foodId);
    if (!food) {
      throw new NotFoundException('Food not found.');
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
      // Conditional transition: a concurrent accept of the same order sees count 0
      // here and bails out, so the food quantity is never decremented twice.
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
