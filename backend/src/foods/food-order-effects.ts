import { OrderType, Prisma } from '../../generated/prisma/client';

export function lockFood(tx: Prisma.TransactionClient, foodId: number): Promise<unknown> {
  return tx.$queryRaw`SELECT id FROM food WHERE id = ${foodId} FOR UPDATE`;
}

export function totalOrdersToUpdateWhere(
  foodId: number,
  pendingStatusId: number,
  quantity: number,
): Prisma.OrderWhereInput {
  return {
    foodId,
    statusId: pendingStatusId,
    deleted: false,
    type: OrderType.TOTAL,
    quantity: { not: quantity },
  };
}

export function partialOrdersToRejectWhere(
  foodId: number,
  pendingStatusId: number,
  quantity: number,
): Prisma.OrderWhereInput {
  return {
    foodId,
    statusId: pendingStatusId,
    deleted: false,
    type: OrderType.PARTIAL,
    quantity: { gt: quantity },
  };
}
