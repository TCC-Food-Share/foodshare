import { FoodRequestType, OrderType, Prisma } from '../../generated/prisma/client';
import { ORDER_STATUS } from '../orders/orders.constants';
import { FOOD_STATUS } from './foods.constants';

/** How many pending orders had their quantity updated and how many were rejected. */
export interface PendingOrdersChange {
  updated: number;
  rejected: number;
}

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
): Promise<PendingOrdersChange> {
  const pendingId = await orderStatusId(tx, ORDER_STATUS.PENDING);
  const rejectedId = await orderStatusId(tx, ORDER_STATUS.REJECTED);
  const { count: updated } = await tx.order.updateMany({
    where: totalOrdersToUpdateWhere(foodId, pendingId, quantity),
    data: { quantity, quantityUpdatedAt: new Date() },
  });
  const { count: rejected } = await tx.order.updateMany({
    where: partialOrdersToRejectWhere(foodId, pendingId, quantity),
    data: { statusId: rejectedId },
  });
  return { updated, rejected };
}

export async function rejectAllPendingOrders(
  tx: Prisma.TransactionClient,
  foodId: number,
): Promise<number> {
  const pendingId = await orderStatusId(tx, ORDER_STATUS.PENDING);
  const rejectedId = await orderStatusId(tx, ORDER_STATUS.REJECTED);
  const { count } = await tx.order.updateMany({
    where: { foodId, statusId: pendingId, deleted: false },
    data: { statusId: rejectedId },
  });
  return count;
}

// RN09 + DT32: cancelling an order in progress gives its quantity back to the food. The caller
// must hold the food lock. A deleted food never gets stock back (DT27).
export async function returnReservedQuantity(
  tx: Prisma.TransactionClient,
  foodId: number,
  quantity: Prisma.Decimal,
): Promise<void> {
  const food = await tx.food.findUniqueOrThrow({
    where: { id: foodId },
    include: { status: true },
  });
  if (food.deleted) {
    return;
  }

  const newQuantity = food.quantity.plus(quantity);
  const active =
    food.status.name === FOOD_STATUS.RESERVED
      ? await tx.foodStatus.findUniqueOrThrow({ where: { name: FOOD_STATUS.ACTIVE } })
      : null;
  await tx.food.update({
    where: { id: foodId },
    data: { quantity: { increment: quantity }, ...(active ? { statusId: active.id } : {}) },
  });

  await applyNewQuantityToPendingOrders(tx, foodId, newQuantity.toNumber());
}

/** The fields of a food whose change affects its pending orders (admin edit, DT58). */
export interface FoodEditTarget {
  catalogItemId: number;
  measurementUnitId: number;
  requestType: FoodRequestType;
  quantity: number;
}

/** What an admin edit does to the pending orders, from the current and the final values. */
export interface PendingOrdersEffect {
  /** Catalog item or unit changed: every pending order asked for something else. */
  rejectAll: boolean;
  /** Request type changed to one that no longer takes this order type. */
  rejectType: OrderType | null;
  /** Quantity changed: RN20 applies to the pending orders left. */
  newQuantity: number | null;
}

const INCOMPATIBLE_ORDER_TYPE: Record<FoodRequestType, OrderType | null> = {
  [FoodRequestType.TOTAL_ONLY]: OrderType.PARTIAL,
  [FoodRequestType.PARTIAL_ONLY]: OrderType.TOTAL,
  [FoodRequestType.TOTAL_OR_PARTIAL]: null,
};

/** DT58 + RN20. Pure: the preview and the edit derive their numbers from the same plan. */
export function pendingOrdersEffect(
  current: FoodEditTarget,
  next: FoodEditTarget,
): PendingOrdersEffect {
  const rejectAll =
    current.catalogItemId !== next.catalogItemId ||
    current.measurementUnitId !== next.measurementUnitId;
  if (rejectAll) return { rejectAll, rejectType: null, newQuantity: null };

  const rejectType =
    current.requestType === next.requestType ? null : INCOMPATIBLE_ORDER_TYPE[next.requestType];
  const newQuantity = current.quantity === next.quantity ? null : next.quantity;
  return { rejectAll, rejectType, newQuantity };
}

/** Applies the plan in a transaction that holds the food lock. */
export async function applyAdminEditToPendingOrders(
  tx: Prisma.TransactionClient,
  foodId: number,
  effect: PendingOrdersEffect,
): Promise<PendingOrdersChange> {
  if (effect.rejectAll) {
    return { updated: 0, rejected: await rejectAllPendingOrders(tx, foodId) };
  }

  let rejected = 0;
  if (effect.rejectType) {
    const pendingId = await orderStatusId(tx, ORDER_STATUS.PENDING);
    const rejectedId = await orderStatusId(tx, ORDER_STATUS.REJECTED);
    const { count } = await tx.order.updateMany({
      where: { foodId, statusId: pendingId, deleted: false, type: effect.rejectType },
      data: { statusId: rejectedId },
    });
    rejected += count;
  }

  if (effect.newQuantity === null) return { updated: 0, rejected };
  const change = await applyNewQuantityToPendingOrders(tx, foodId, effect.newQuantity);
  return { updated: change.updated, rejected: rejected + change.rejected };
}

/** Counts what the plan would do, without writing (preview before saving). */
export async function countAdminEditEffect(
  client: Prisma.TransactionClient,
  foodId: number,
  effect: PendingOrdersEffect,
): Promise<PendingOrdersChange> {
  const pendingId = await orderStatusId(client, ORDER_STATUS.PENDING);
  if (effect.rejectAll) {
    const rejected = await client.order.count({
      where: { foodId, statusId: pendingId, deleted: false },
    });
    return { updated: 0, rejected };
  }

  let rejected = 0;
  if (effect.rejectType) {
    rejected += await client.order.count({
      where: { foodId, statusId: pendingId, deleted: false, type: effect.rejectType },
    });
  }
  if (effect.newQuantity === null) return { updated: 0, rejected };

  const quantity = effect.newQuantity;
  const [updated, partialRejected] = await Promise.all([
    effect.rejectType === OrderType.TOTAL
      ? 0
      : client.order.count({ where: totalOrdersToUpdateWhere(foodId, pendingId, quantity) }),
    effect.rejectType === OrderType.PARTIAL
      ? 0
      : client.order.count({ where: partialOrdersToRejectWhere(foodId, pendingId, quantity) }),
  ]);
  return { updated, rejected: rejected + partialRejected };
}
