import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { OrderCancelledBy, Prisma } from '../../generated/prisma/client';
import { lockLiveBeneficiaryEntityForShare } from '../account-deletion/institution-locks';
import { DEFAULT_PAGE_SIZE } from '../common/pagination';
import { ImageStorageService } from '../files/image-storage.service';
import {
  applyNewQuantityToPendingOrders,
  lockFood,
  orderStatusId,
  partialOrdersToRejectWhere,
  rejectAllPendingOrders,
  returnReservedQuantity,
  totalOrdersToUpdateWhere,
} from '../foods/food-order-effects';
import { FOOD_STATUS } from '../foods/foods.constants';
import { FoodsService } from '../foods/foods.service';
import { PrismaService } from '../prisma/prisma.service';
import { assertSelectableReason } from './cancellation-reason';
import { AcceptImpactResponseDto } from './dto/accept-impact-response.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { OrderDetailResponseDto } from './dto/order-detail-response.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { PaginatedOrdersResponseDto } from './dto/paginated-orders-response.dto';
import { checkOrderQuantity, orderTypeFor } from './order-quantity';
import {
  DEFAULT_PAGE,
  OPEN_ORDER_STATUSES,
  ORDER_CONFLICT_CODES,
  ORDER_STATUS,
} from './orders.constants';

const MAX_OPEN_ORDERS = 10;

const ORDER_INCLUDE = {
  status: true,
  food: { include: { catalogItem: true, measurementUnit: true } },
  establishment: true,
  beneficiaryEntity: true,
  cancellationReason: true,
} as const satisfies Prisma.OrderInclude;

type OrderConflictCode = (typeof ORDER_CONFLICT_CODES)[keyof typeof ORDER_CONFLICT_CODES];

function orderConflict(code: OrderConflictCode, message: string): ConflictException {
  return new ConflictException({ statusCode: 409, error: 'Conflict', message, code });
}

interface AcceptEvaluation {
  orderId: number;
  foodId: number;
  quantity: Prisma.Decimal;
  newQuantity: number;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly foodsService: FoodsService,
    private readonly storage: ImageStorageService,
  ) {}

  async create(userId: number, dto: CreateOrderDto): Promise<OrderResponseDto> {
    const beneficiaryEntity = await this.prisma.beneficiaryEntity.findUnique({ where: { userId } });
    if (!beneficiaryEntity) {
      throw new NotFoundException('Beneficiary entity not found.');
    }

    const openOrders = await this.prisma.order.count({
      where: this.openOrdersWhere(beneficiaryEntity.id),
    });
    if (openOrders >= MAX_OPEN_ORDERS) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: 'Beneficiary entity has reached the limit of open orders.',
        code: ORDER_CONFLICT_CODES.limitReached,
      });
    }

    const order = await this.prisma.$transaction(async (tx) => {
      // Entity before food (lock order of account deletion): a deletion in flight finishes first.
      if (!(await lockLiveBeneficiaryEntityForShare(tx, beneficiaryEntity.id))) {
        throw new NotFoundException('Beneficiary entity not found.');
      }
      await lockFood(tx, dto.foodId);

      const food = await this.foodsService.findAvailableById(dto.foodId, tx);
      if (!food) {
        throw new NotFoundException('Food not found.');
      }

      const duplicate = await tx.order.findFirst({
        where: { ...this.openOrdersWhere(beneficiaryEntity.id), foodId: food.id },
        select: { id: true },
      });
      if (duplicate) {
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          message: 'Beneficiary entity already has an open order for this food.',
          code: ORDER_CONFLICT_CODES.duplicateInProgress,
        });
      }

      const quantityError = checkOrderQuantity(
        dto.quantity,
        food.quantity,
        food.measurementUnit.allowsFraction,
        food.requestType,
      );
      if (quantityError) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Requested quantity is not allowed for this food.',
          code: quantityError,
        });
      }

      const status = await tx.orderStatus.findUniqueOrThrow({
        where: { name: ORDER_STATUS.PENDING },
      });

      return tx.order.create({
        data: {
          quantity: dto.quantity,
          type: orderTypeFor(dto.quantity, food.quantity, food.requestType),
          foodId: food.id,
          statusId: status.id,
          establishmentId: food.establishmentId,
          beneficiaryEntityId: beneficiaryEntity.id,
        },
        include: ORDER_INCLUDE,
      });
    });

    return this.toResponse(order);
  }

  async acceptImpact(userId: number, orderId: number): Promise<AcceptImpactResponseDto> {
    const establishmentId = await this.requireEstablishmentId(userId);
    const found = await this.findOwnOrder(orderId, { establishmentId });
    const { foodId, newQuantity } = await this.evaluateAccept(this.prisma, found.id);
    const pendingId = await orderStatusId(this.prisma, ORDER_STATUS.PENDING);

    if (newQuantity === 0) {
      const pendingOrdersToReject = await this.prisma.order.count({
        where: { foodId, statusId: pendingId, deleted: false, id: { not: found.id } },
      });
      return { pendingOrdersToReject, totalOrdersToUpdate: 0, foodWillBeReserved: true };
    }

    const [pendingOrdersToReject, totalOrdersToUpdate] = await Promise.all([
      this.prisma.order.count({
        where: {
          ...partialOrdersToRejectWhere(foodId, pendingId, newQuantity),
          id: { not: found.id },
        },
      }),
      this.prisma.order.count({
        where: {
          ...totalOrdersToUpdateWhere(foodId, pendingId, newQuantity),
          id: { not: found.id },
        },
      }),
    ]);
    return { pendingOrdersToReject, totalOrdersToUpdate, foodWillBeReserved: false };
  }

  async accept(userId: number, orderId: number): Promise<OrderResponseDto> {
    const establishmentId = await this.requireEstablishmentId(userId);
    const found = await this.findOwnOrder(orderId, { establishmentId });

    const [pendingId, inProgressId] = await Promise.all([
      orderStatusId(this.prisma, ORDER_STATUS.PENDING),
      orderStatusId(this.prisma, ORDER_STATUS.IN_PROGRESS),
    ]);

    const updated = await this.prisma.$transaction(async (tx) => {
      // The food row is locked before any order row, in the same order as the food actions,
      // so an accept and a stock edit cannot deadlock. Order and stock are read after the lock.
      await lockFood(tx, found.foodId);

      const {
        orderId: id,
        foodId,
        quantity,
        newQuantity,
      } = await this.evaluateAccept(tx, found.id);

      const moved = await tx.order.updateMany({
        where: { id, statusId: pendingId },
        data: { statusId: inProgressId, acceptedAt: new Date() },
      });
      if (moved.count === 0) {
        throw orderConflict(ORDER_CONFLICT_CODES.notPending, 'Order is not pending.');
      }

      const reserved = await tx.food.updateMany({
        where: { id: foodId, quantity: { gte: quantity } },
        data: { quantity: { decrement: quantity } },
      });
      if (reserved.count === 0) {
        throw orderConflict(
          ORDER_CONFLICT_CODES.insufficientQuantity,
          'Insufficient food quantity to accept this order.',
        );
      }

      if (newQuantity === 0) {
        const reservedStatus = await tx.foodStatus.findUniqueOrThrow({
          where: { name: FOOD_STATUS.RESERVED },
        });
        await tx.food.update({ where: { id: foodId }, data: { statusId: reservedStatus.id } });
        await rejectAllPendingOrders(tx, foodId);
      } else {
        await applyNewQuantityToPendingOrders(tx, foodId, newQuantity);
      }

      return tx.order.findUniqueOrThrow({ where: { id }, include: ORDER_INCLUDE });
    });

    return this.toResponse(updated);
  }

  async reject(userId: number, orderId: number): Promise<OrderResponseDto> {
    const establishmentId = await this.requireEstablishmentId(userId);
    const order = await this.findOwnOrder(orderId, { establishmentId });

    const [pendingId, rejectedId] = await Promise.all([
      orderStatusId(this.prisma, ORDER_STATUS.PENDING),
      orderStatusId(this.prisma, ORDER_STATUS.REJECTED),
    ]);
    if (order.statusId !== pendingId) {
      throw orderConflict(ORDER_CONFLICT_CODES.notPending, 'Order is not pending.');
    }

    // Conditional update as a compare-and-swap: a concurrent accept/reject sees count 0 here.
    const moved = await this.prisma.order.updateMany({
      where: { id: order.id, statusId: pendingId },
      data: { statusId: rejectedId },
    });
    if (moved.count === 0) {
      throw orderConflict(ORDER_CONFLICT_CODES.notPending, 'Order is not pending.');
    }

    const updated = await this.prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: ORDER_INCLUDE,
    });

    return this.toResponse(updated);
  }

  async receive(userId: number, orderId: number): Promise<OrderResponseDto> {
    const beneficiaryEntity = await this.prisma.beneficiaryEntity.findUnique({ where: { userId } });
    if (!beneficiaryEntity) {
      throw new NotFoundException('Beneficiary entity not found.');
    }
    const found = await this.findOwnOrder(orderId, { beneficiaryEntityId: beneficiaryEntity.id });

    const [inProgressId, donatedId] = await Promise.all([
      orderStatusId(this.prisma, ORDER_STATUS.IN_PROGRESS),
      orderStatusId(this.prisma, ORDER_STATUS.DONATED),
    ]);
    if (found.statusId !== inProgressId) {
      throw orderConflict(ORDER_CONFLICT_CODES.notInProgress, 'Order is not in progress.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Locking the food serializes the last confirmations of the same food: the second one
      // waits, then counts the first as already donated, so the food cannot stay reserved.
      await lockFood(tx, found.foodId);

      const moved = await tx.order.updateMany({
        where: { id: found.id, statusId: inProgressId, deleted: false },
        data: { statusId: donatedId },
      });
      if (moved.count === 0) {
        throw orderConflict(ORDER_CONFLICT_CODES.notInProgress, 'Order is not in progress.');
      }

      const food = await tx.food.findUniqueOrThrow({ where: { id: found.foodId } });
      const othersInProgress = await tx.order.count({
        where: { foodId: found.foodId, statusId: inProgressId, deleted: false },
      });
      if (!food.deleted && food.quantity.isZero() && othersInProgress === 0) {
        const inactive = await tx.foodStatus.findUniqueOrThrow({
          where: { name: FOOD_STATUS.INACTIVE },
        });
        await tx.food.update({ where: { id: food.id }, data: { statusId: inactive.id } });
        await rejectAllPendingOrders(tx, food.id);
      }

      return tx.order.findUniqueOrThrow({ where: { id: found.id }, include: ORDER_INCLUDE });
    });

    return this.toResponse(updated);
  }

  async cancel(userId: number, orderId: number, dto: CancelOrderDto): Promise<OrderResponseDto> {
    const party = await this.resolveParty(userId);
    const found = await this.findOwnOrder(orderId, party.owner);

    const [pendingId, inProgressId, cancelledId] = await Promise.all([
      orderStatusId(this.prisma, ORDER_STATUS.PENDING),
      orderStatusId(this.prisma, ORDER_STATUS.IN_PROGRESS),
      orderStatusId(this.prisma, ORDER_STATUS.CANCELLED),
    ]);

    const updated = await this.prisma.$transaction(async (tx) => {
      await assertSelectableReason(tx, dto.cancellationReasonId);

      // Food first, then the order, as in accept/receive. The stock effect depends on the status
      // read after the lock: an accept that won the race has already taken the stock.
      await lockFood(tx, found.foodId);
      const order = await tx.order.findUniqueOrThrow({ where: { id: found.id } });
      if (order.statusId !== pendingId && order.statusId !== inProgressId) {
        throw orderConflict(ORDER_CONFLICT_CODES.notOpen, 'Order is not open.');
      }

      const moved = await tx.order.updateMany({
        where: { id: order.id, statusId: order.statusId, deleted: false },
        data: {
          statusId: cancelledId,
          cancellationReasonId: dto.cancellationReasonId,
          cancelledBy: party.cancelledBy,
        },
      });
      if (moved.count === 0) {
        throw orderConflict(ORDER_CONFLICT_CODES.notOpen, 'Order is not open.');
      }

      if (order.statusId === inProgressId) {
        await returnReservedQuantity(tx, order.foodId, order.quantity);
      }

      return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: ORDER_INCLUDE });
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

    const owner = establishment
      ? { establishmentId: establishment.id }
      : { beneficiaryEntityId: beneficiaryEntity!.id };

    const where: Prisma.OrderWhereInput = {
      deleted: false,
      ...owner,
      ...(query.beneficiaryEntityId !== undefined
        ? { AND: [{ beneficiaryEntityId: query.beneficiaryEntityId }] }
        : {}),
      ...(query.status ? { status: { name: query.status } } : {}),
      ...(query.search ? { id: { in: await this.searchOrderIds(owner, query.search) } } : {}),
    };

    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { orderDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data: rows.map((row) => this.toResponse(row)), total, page, pageSize };
  }

  /**
   * Ids dos pedidos do dono que casam com a busca (RF27). `unaccent` não existe no Prisma Client,
   * então a busca é SQL cru; o recorte de dono e a exclusão lógica ficam no mesmo WHERE.
   * `orderDate` é `timestamp` sem fuso, gravado em UTC: converte para Brasília antes de formatar.
   */
  private async searchOrderIds(
    owner: { establishmentId: number } | { beneficiaryEntityId: number },
    term: string,
  ): Promise<number[]> {
    const ownerSql =
      'establishmentId' in owner
        ? Prisma.sql`o."establishmentId" = ${owner.establishmentId}`
        : Prisma.sql`o."beneficiaryEntityId" = ${owner.beneficiaryEntityId}`;

    const rows = await this.prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
      SELECT o.id
      FROM "order" o
      JOIN food f ON f.id = o."foodId"
      JOIN food_catalog_item ci ON ci.id = f."catalogItemId"
      JOIN establishment e ON e.id = o."establishmentId"
      WHERE o.deleted = false AND ${ownerSql} AND (
        unaccent(ci.name) ILIKE '%' || unaccent(${term}) || '%'
        OR unaccent(e."companyName") ILIKE '%' || unaccent(${term}) || '%'
        OR unaccent(COALESCE(e."tradeName", '')) ILIKE '%' || unaccent(${term}) || '%'
        OR to_char(
          o."orderDate" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo',
          'DD/MM/YYYY'
        ) ILIKE '%' || ${term} || '%'
      )
    `);
    return rows.map((row) => row.id);
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
        food: {
          include: {
            catalogItem: { include: { category: true } },
            measurementUnit: true,
            status: true,
          },
        },
        establishment: { include: { address: true } },
        beneficiaryEntity: { include: { address: true } },
        cancellationReason: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return this.toDetailResponse(order, establishment ? 'establishment' : 'beneficiaryEntity');
  }

  private async requireEstablishmentId(userId: number): Promise<number> {
    const establishment = await this.prisma.establishment.findUnique({ where: { userId } });
    if (!establishment) {
      throw new NotFoundException('Establishment not found.');
    }
    return establishment.id;
  }

  private async resolveParty(userId: number): Promise<{
    owner: { establishmentId: number } | { beneficiaryEntityId: number };
    cancelledBy: OrderCancelledBy;
  }> {
    const establishment = await this.prisma.establishment.findUnique({ where: { userId } });
    if (establishment) {
      return {
        owner: { establishmentId: establishment.id },
        cancelledBy: OrderCancelledBy.ESTABLISHMENT,
      };
    }
    const beneficiaryEntity = await this.prisma.beneficiaryEntity.findUnique({ where: { userId } });
    if (beneficiaryEntity) {
      return {
        owner: { beneficiaryEntityId: beneficiaryEntity.id },
        cancelledBy: OrderCancelledBy.BENEFICIARY_ENTITY,
      };
    }
    throw new NotFoundException('Order not found.');
  }

  private mapCancellation(order: {
    cancellationReason: { id: number; name: string } | null;
    cancelledBy: OrderCancelledBy | null;
  }) {
    return {
      cancellationReason: order.cancellationReason
        ? { id: order.cancellationReason.id, name: order.cancellationReason.name }
        : null,
      cancelledBy: order.cancelledBy,
    };
  }

  private async findOwnOrder(
    orderId: number,
    owner: { establishmentId: number } | { beneficiaryEntityId: number },
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deleted: false, ...owner },
    });
    if (!order) {
      throw new NotFoundException('Order not found.');
    }
    return order;
  }

  private async evaluateAccept(
    client: Prisma.TransactionClient,
    orderId: number,
  ): Promise<AcceptEvaluation> {
    const pendingId = await orderStatusId(client, ORDER_STATUS.PENDING);
    const order = await client.order.findFirst({ where: { id: orderId, deleted: false } });
    if (!order) {
      throw new NotFoundException('Order not found.');
    }
    if (order.statusId !== pendingId) {
      throw orderConflict(ORDER_CONFLICT_CODES.notPending, 'Order is not pending.');
    }

    const food = await this.foodsService.findAvailableById(order.foodId, client);
    if (!food) {
      throw orderConflict(
        ORDER_CONFLICT_CODES.foodNotAvailable,
        'Linked food is no longer available.',
      );
    }
    if (food.quantity.lessThan(order.quantity)) {
      throw orderConflict(
        ORDER_CONFLICT_CODES.insufficientQuantity,
        'Insufficient food quantity to accept this order.',
      );
    }

    return {
      orderId: order.id,
      foodId: food.id,
      quantity: order.quantity,
      newQuantity: food.quantity.minus(order.quantity).toNumber(),
    };
  }

  private openOrdersWhere(beneficiaryEntityId: number): Prisma.OrderWhereInput {
    return {
      beneficiaryEntityId,
      deleted: false,
      status: { name: { in: OPEN_ORDER_STATUSES } },
    };
  }

  private mapInstitution(
    inst: {
      id: number;
      companyName: string;
      tradeName: string | null;
      description: string;
      institutionalEmail: string;
      institutionalPhone: string;
      address: {
        postalCode: string;
        street: string;
        number: string;
        complement: string | null;
        city: string;
        state: string;
      };
    },
    showContact: boolean,
  ) {
    return {
      id: inst.id,
      companyName: inst.companyName,
      tradeName: inst.tradeName,
      description: inst.description,
      city: inst.address.city,
      state: inst.address.state,
      institutionalEmail: showContact ? inst.institutionalEmail : null,
      institutionalPhone: showContact ? inst.institutionalPhone : null,
      address: showContact
        ? {
            postalCode: inst.address.postalCode,
            street: inst.address.street,
            number: inst.address.number,
            complement: inst.address.complement,
            city: inst.address.city,
            state: inst.address.state,
          }
        : null,
    };
  }

  private toDetailResponse(
    order: Prisma.OrderGetPayload<{
      include: {
        status: true;
        food: {
          include: {
            catalogItem: { include: { category: true } };
            measurementUnit: true;
            status: true;
          };
        };
        establishment: { include: { address: true } };
        beneficiaryEntity: { include: { address: true } };
        cancellationReason: true;
      };
    }>,
    viewer: 'establishment' | 'beneficiaryEntity',
  ): OrderDetailResponseDto {
    // RN12: contato e endereço só da outra parte e só enquanto o pedido está "Em andamento".
    const contactVisible = order.status.name === ORDER_STATUS.IN_PROGRESS;
    return {
      id: order.id,
      quantity: order.quantity.toString(),
      orderDate: order.orderDate,
      quantityUpdatedAt: order.quantityUpdatedAt,
      status: { id: order.status.id, name: order.status.name },
      food: {
        id: order.food.id,
        image: this.storage.toUrl(order.food.image),
        name: order.food.catalogItem.name,
        quantity: order.food.quantity.toString(),
        quantityUnit: order.food.measurementUnit.abbreviation,
        description: order.food.description,
        expirationDate: order.food.expirationDate,
        category: {
          id: order.food.catalogItem.category.id,
          name: order.food.catalogItem.category.name,
        },
        status: { id: order.food.status.id, name: order.food.status.name },
      },
      establishment: this.mapInstitution(
        order.establishment,
        contactVisible && viewer === 'beneficiaryEntity',
      ),
      beneficiaryEntity: this.mapInstitution(
        order.beneficiaryEntity,
        contactVisible && viewer === 'establishment',
      ),
      ...this.mapCancellation(order),
    };
  }

  private toResponse(
    order: Prisma.OrderGetPayload<{
      include: typeof ORDER_INCLUDE;
    }>,
  ): OrderResponseDto {
    return {
      id: order.id,
      quantity: order.quantity.toString(),
      orderDate: order.orderDate,
      status: { id: order.status.id, name: order.status.name },
      food: {
        id: order.food.id,
        name: order.food.catalogItem.name,
        quantityUnit: order.food.measurementUnit.abbreviation,
      },
      establishment: {
        id: order.establishment.id,
        companyName: order.establishment.companyName,
      },
      beneficiaryEntity: {
        id: order.beneficiaryEntity.id,
        companyName: order.beneficiaryEntity.companyName,
      },
      ...this.mapCancellation(order),
    };
  }
}
