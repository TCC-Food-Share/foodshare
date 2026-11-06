import { OrderType, Prisma } from '../../generated/prisma/client';
import { ORDER_STATUS } from '../orders/orders.constants';

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

export async function orderStatusId(
  client: Prisma.TransactionClient,
  name: (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS],
): Promise<number> {
  const status = await client.orderStatus.findUniqueOrThrow({ where: { name } });
  return status.id;
}

export async function applyNewQuantityToPendingOrders(
  tx: Prisma.TransactionClient,
  foodId: number,
  quantity: number,
): Promise<void> {
  const pendingId = await orderStatusId(tx, ORDER_STATUS.PENDING);
  const rejectedId = await orderStatusId(tx, ORDER_STATUS.REJECTED);
  await tx.order.updateMany({
    where: totalOrdersToUpdateWhere(foodId, pendingId, quantity),
    data: { quantity, quantityUpdatedAt: new Date() },
  });
  await tx.order.updateMany({
    where: partialOrdersToRejectWhere(foodId, pendingId, quantity),
    data: { statusId: rejectedId },
  });
}

export async function rejectAllPendingOrders(
  tx: Prisma.TransactionClient,
  foodId: number,
): Promise<void> {
  const pendingId = await orderStatusId(tx, ORDER_STATUS.PENDING);
  const rejectedId = await orderStatusId(tx, ORDER_STATUS.REJECTED);
  await tx.order.updateMany({
    where: { foodId, statusId: pendingId, deleted: false },
    data: { statusId: rejectedId },
  });
}
