import { describe, expect, it, jest } from '@jest/globals';

import { OrderType, Prisma } from '../../generated/prisma/client';
import {
  lockFood,
  partialOrdersToRejectWhere,
  totalOrdersToUpdateWhere,
} from './food-order-effects';

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
});
