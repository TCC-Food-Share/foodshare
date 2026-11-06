import { describe, expect, it } from '@jest/globals';

import { FoodRequestType, OrderType, Prisma } from '../../generated/prisma/client';
import { checkOrderQuantity, orderTypeFor } from './order-quantity';
import { ORDER_QUANTITY_CODES } from './orders.constants';

const { TOTAL_ONLY, PARTIAL_ONLY, TOTAL_OR_PARTIAL } = FoodRequestType;
const stock = (value: number) => new Prisma.Decimal(value);

describe('checkOrderQuantity', () => {
  it('rejects a quantity above the stock before anything else', () => {
    expect(checkOrderQuantity(6, stock(5), false, TOTAL_ONLY)).toBe(
      ORDER_QUANTITY_CODES.exceedsAvailable,
    );
    expect(checkOrderQuantity(5.5, stock(5), false, PARTIAL_ONLY)).toBe(
      ORDER_QUANTITY_CODES.exceedsAvailable,
    );
  });

  it('rejects a fraction when the unit does not allow it, before the request type', () => {
    expect(checkOrderQuantity(2.5, stock(5), false, TOTAL_ONLY)).toBe(
      ORDER_QUANTITY_CODES.fractionNotAllowed,
    );
  });

  it('accepts a fraction when the unit allows it', () => {
    expect(checkOrderQuantity(2.5, stock(10), true, TOTAL_OR_PARTIAL)).toBeNull();
  });

  it('total-only accepts only the whole stock', () => {
    expect(checkOrderQuantity(5, stock(5), false, TOTAL_ONLY)).toBeNull();
    expect(checkOrderQuantity(3, stock(5), false, TOTAL_ONLY)).toBe(
      ORDER_QUANTITY_CODES.totalRequired,
    );
  });

  it('partial-only accepts less than the stock and refuses the whole stock', () => {
    expect(checkOrderQuantity(3, stock(5), false, PARTIAL_ONLY)).toBeNull();
    expect(checkOrderQuantity(5, stock(5), false, PARTIAL_ONLY)).toBe(
      ORDER_QUANTITY_CODES.partialRequired,
    );
  });

  it('partial-only accepts the whole leftover when no partial order is possible', () => {
    expect(checkOrderQuantity(1, stock(1), false, PARTIAL_ONLY)).toBeNull();
    expect(checkOrderQuantity(0.01, stock(0.01), true, PARTIAL_ONLY)).toBeNull();
  });

  it('partial-only refuses the whole stock while 0.01 is still a partial order', () => {
    expect(checkOrderQuantity(0.02, stock(0.02), true, PARTIAL_ONLY)).toBe(
      ORDER_QUANTITY_CODES.partialRequired,
    );
  });

  it('total-or-partial accepts the whole stock and any part of it', () => {
    expect(checkOrderQuantity(5, stock(5), false, TOTAL_OR_PARTIAL)).toBeNull();
    expect(checkOrderQuantity(2, stock(5), false, TOTAL_OR_PARTIAL)).toBeNull();
  });
});

describe('orderTypeFor', () => {
  it('total-only orders are total', () => {
    expect(orderTypeFor(5, stock(5), TOTAL_ONLY)).toBe(OrderType.TOTAL);
  });

  it('total-or-partial orders are total for the whole stock and partial otherwise', () => {
    expect(orderTypeFor(5, stock(5), TOTAL_OR_PARTIAL)).toBe(OrderType.TOTAL);
    expect(orderTypeFor(2, stock(5), TOTAL_OR_PARTIAL)).toBe(OrderType.PARTIAL);
  });

  it('partial-only orders are partial, including the leftover', () => {
    expect(orderTypeFor(3, stock(5), PARTIAL_ONLY)).toBe(OrderType.PARTIAL);
    expect(orderTypeFor(1, stock(1), PARTIAL_ONLY)).toBe(OrderType.PARTIAL);
  });
});
