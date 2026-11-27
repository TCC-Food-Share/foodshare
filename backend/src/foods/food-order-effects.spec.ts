import { describe, expect, it, jest } from '@jest/globals';

import { FoodRequestType, OrderType, Prisma } from '../../generated/prisma/client';
import { ORDER_STATUS } from '../orders/orders.constants';
import {
  applyAdminEditToPendingOrders,
  countAdminEditEffect,
  type FoodEditTarget,
  lockFood,
  partialOrdersToRejectWhere,
  pendingOrdersEffect,
  totalOrdersToUpdateWhere,
} from './food-order-effects';

const STATUS_ID: Record<string, number> = {
  [ORDER_STATUS.PENDING]: 1,
  [ORDER_STATUS.IN_PROGRESS]: 2,
  [ORDER_STATUS.REJECTED]: 3,
  [ORDER_STATUS.DONATED]: 4,
  [ORDER_STATUS.CANCELLED]: 5,
};
const { PENDING, REJECTED, DONATED, CANCELLED } = ORDER_STATUS;

interface FakeOrder {
  id: number;
  foodId: number;
  statusId: number;
  deleted: boolean;
  type: OrderType;
  quantity: number;
  quantityUpdatedAt: Date | null;
}

type QuantityFilter = number | { not?: number; gt?: number };
interface FakeWhere {
  foodId?: number;
  statusId?: number;
  deleted?: boolean;
  type?: OrderType;
  quantity?: QuantityFilter;
}

/** Just enough of the order table to run the effects for real and check the outcome. */
function fakeOrders(rows: Omit<FakeOrder, 'id' | 'foodId' | 'deleted' | 'quantityUpdatedAt'>[]) {
  const orders: FakeOrder[] = rows.map((row, index) => ({
    id: index + 1,
    foodId: 7,
    deleted: false,
    quantityUpdatedAt: null,
    ...row,
  }));
  const quantityMatches = (value: number, filter?: QuantityFilter) => {
    if (filter === undefined) return true;
    if (typeof filter === 'number') return value === filter;
    if (filter.not !== undefined && value === filter.not) return false;
    if (filter.gt !== undefined && !(value > filter.gt)) return false;
    return true;
  };
  const matching = (where: FakeWhere) =>
    orders.filter(
      (order) =>
        (where.foodId === undefined || order.foodId === where.foodId) &&
        (where.statusId === undefined || order.statusId === where.statusId) &&
        (where.deleted === undefined || order.deleted === where.deleted) &&
        (where.type === undefined || order.type === where.type) &&
        quantityMatches(order.quantity, where.quantity),
    );
  const client = {
    orderStatus: {
      findUniqueOrThrow: ({ where }: { where: { name: string } }) =>
        Promise.resolve({ id: STATUS_ID[where.name], name: where.name }),
    },
    order: {
      count: ({ where }: { where: FakeWhere }) => Promise.resolve(matching(where).length),
      updateMany: ({ where, data }: { where: FakeWhere; data: Partial<FakeOrder> }) => {
        const hit = matching(where);
        for (const order of hit) Object.assign(order, data);
        return Promise.resolve({ count: hit.length });
      },
    },
  };
  return { orders, client: client as unknown as Prisma.TransactionClient };
}

const pending = (type: OrderType, quantity: number) => ({
  statusId: STATUS_ID[PENDING],
  type,
  quantity,
});
const statusOf = (order: FakeOrder) =>
  Object.keys(STATUS_ID).find((name) => STATUS_ID[name] === order.statusId);

const base: FoodEditTarget = {
  catalogItemId: 13,
  measurementUnitId: 1,
  requestType: FoodRequestType.TOTAL_OR_PARTIAL,
  quantity: 5,
};

describe('food order effects', () => {
  it('selects pending total orders whose quantity differs from the new stock', () => {
    expect(totalOrdersToUpdateWhere(5, 1, 4)).toEqual({
      foodId: 5,
      statusId: 1,
      deleted: false,
      type: OrderType.TOTAL,
      quantity: { not: 4 },
    });
  });

  it('selects pending partial orders larger than the new stock', () => {
    expect(partialOrdersToRejectWhere(5, 1, 4)).toEqual({
      foodId: 5,
      statusId: 1,
      deleted: false,
      type: OrderType.PARTIAL,
      quantity: { gt: 4 },
    });
  });

  it('locks the food row with FOR UPDATE', async () => {
    const queryRaw = jest.fn<(strings: TemplateStringsArray, id: number) => Promise<unknown>>();
    queryRaw.mockResolvedValue([]);

    await lockFood({ $queryRaw: queryRaw } as unknown as Prisma.TransactionClient, 5);

    expect(queryRaw.mock.calls[0][0].join('?')).toBe('SELECT id FROM food WHERE id = ? FOR UPDATE');
    expect(queryRaw.mock.calls[0][1]).toBe(5);
  });

  describe('pendingOrdersEffect (DT58)', () => {
    it('rejects every pending order when the catalog item changes', () => {
      expect(pendingOrdersEffect(base, { ...base, catalogItemId: 14, quantity: 8 })).toEqual({
        rejectAll: true,
        rejectType: null,
        newQuantity: null,
      });
    });

    it('rejects every pending order when the unit changes', () => {
      expect(pendingOrdersEffect(base, { ...base, measurementUnitId: 2 }).rejectAll).toBe(true);
    });

    it.each([
      [FoodRequestType.TOTAL_ONLY, OrderType.PARTIAL],
      [FoodRequestType.PARTIAL_ONLY, OrderType.TOTAL],
    ])('rejects the incompatible type when the request type becomes %s', (requestType, type) => {
      expect(pendingOrdersEffect(base, { ...base, requestType })).toEqual({
        rejectAll: false,
        rejectType: type,
        newQuantity: null,
      });
    });

    it('rejects no type when the request type becomes TOTAL_OR_PARTIAL', () => {
      const current = { ...base, requestType: FoodRequestType.TOTAL_ONLY };
      expect(pendingOrdersEffect(current, base).rejectType).toBeNull();
    });

    it('applies RN20 when only the quantity changes', () => {
      expect(pendingOrdersEffect(base, { ...base, quantity: 6 })).toEqual({
        rejectAll: false,
        rejectType: null,
        newQuantity: 6,
      });
    });

    it('combines the type and the quantity', () => {
      const next = { ...base, requestType: FoodRequestType.TOTAL_ONLY, quantity: 12 };
      expect(pendingOrdersEffect(base, next)).toEqual({
        rejectAll: false,
        rejectType: OrderType.PARTIAL,
        newQuantity: 12,
      });
    });

    it('does nothing when nothing that matters changed', () => {
      expect(pendingOrdersEffect(base, { ...base })).toEqual({
        rejectAll: false,
        rejectType: null,
        newQuantity: null,
      });
    });
  });

  describe('applyAdminEditToPendingOrders and countAdminEditEffect', () => {
    // Every case runs the preview first and then the edit on the same rows: the numbers must match.
    async function run(
      rows: Parameters<typeof fakeOrders>[0],
      current: FoodEditTarget,
      next: FoodEditTarget,
    ) {
      const { orders, client } = fakeOrders(rows);
      const effect = pendingOrdersEffect(current, next);
      const preview = await countAdminEditEffect(client, 7, effect);
      const applied = await applyAdminEditToPendingOrders(client, 7, effect);
      expect(applied).toEqual(preview);
      return { orders, applied };
    }

    it('rejects the total and the partial when the catalog item changes', async () => {
      const { orders, applied } = await run(
        [pending(OrderType.TOTAL, 5), pending(OrderType.PARTIAL, 2)],
        base,
        { ...base, catalogItemId: 14 },
      );
      expect(orders.map(statusOf)).toEqual([REJECTED, REJECTED]);
      expect(applied).toEqual({ updated: 0, rejected: 2 });
    });

    it('rejects the partial and keeps the total when the type becomes TOTAL_ONLY', async () => {
      const { orders } = await run(
        [pending(OrderType.TOTAL, 5), pending(OrderType.PARTIAL, 2)],
        base,
        { ...base, requestType: FoodRequestType.TOTAL_ONLY },
      );
      expect(orders.map(statusOf)).toEqual([PENDING, REJECTED]);
    });

    it('rejects the total and keeps the partial when the type becomes PARTIAL_ONLY', async () => {
      const current = { ...base, quantity: 10 };
      const { orders } = await run(
        [pending(OrderType.TOTAL, 10), pending(OrderType.PARTIAL, 3)],
        current,
        { ...current, requestType: FoodRequestType.PARTIAL_ONLY },
      );
      expect(orders.map(statusOf)).toEqual([REJECTED, PENDING]);
    });

    it('keeps the total order when the type becomes TOTAL_OR_PARTIAL', async () => {
      const current = { ...base, requestType: FoodRequestType.TOTAL_ONLY };
      const { orders, applied } = await run([pending(OrderType.TOTAL, 5)], current, base);
      expect(orders.map(statusOf)).toEqual([PENDING]);
      expect(orders[0].quantity).toBe(5);
      expect(applied).toEqual({ updated: 0, rejected: 0 });
    });

    it('moves the total order to the new stock, up or down (RN20)', async () => {
      const up = await run([pending(OrderType.TOTAL, 5)], base, { ...base, quantity: 6 });
      expect(up.orders[0]).toMatchObject({ quantity: 6, quantityUpdatedAt: expect.any(Date) });
      expect(up.applied).toEqual({ updated: 1, rejected: 0 });

      const down = await run([pending(OrderType.TOTAL, 5)], base, { ...base, quantity: 4 });
      expect(down.orders[0].quantity).toBe(4);
    });

    it('rejects only the partial order that no longer fits (RN20)', async () => {
      const { orders } = await run(
        [pending(OrderType.PARTIAL, 3), pending(OrderType.PARTIAL, 5)],
        base,
        { ...base, quantity: 4 },
      );
      expect(orders.map(statusOf)).toEqual([PENDING, REJECTED]);
    });

    it('rejects the partial by type and moves the total when type and quantity change', async () => {
      const current = { ...base, quantity: 10 };
      const { orders, applied } = await run(
        [pending(OrderType.TOTAL, 10), pending(OrderType.PARTIAL, 8)],
        current,
        { ...current, requestType: FoodRequestType.TOTAL_ONLY, quantity: 12 },
      );
      expect(orders.map(statusOf)).toEqual([PENDING, REJECTED]);
      expect(orders[0].quantity).toBe(12);
      expect(applied).toEqual({ updated: 1, rejected: 1 });
    });

    it('never touches finished orders', async () => {
      const { orders } = await run(
        [
          { statusId: STATUS_ID[DONATED], type: OrderType.TOTAL, quantity: 5 },
          { statusId: STATUS_ID[CANCELLED], type: OrderType.PARTIAL, quantity: 2 },
        ],
        base,
        { ...base, catalogItemId: 14 },
      );
      expect(orders.map(statusOf)).toEqual([DONATED, CANCELLED]);
    });

    it('counts nothing when nothing changes', async () => {
      const { applied } = await run([pending(OrderType.TOTAL, 5)], base, { ...base });
      expect(applied).toEqual({ updated: 0, rejected: 0 });
    });
  });
});
