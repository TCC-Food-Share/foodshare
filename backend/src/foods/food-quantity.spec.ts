import { describe, expect, it } from '@jest/globals';

import { FoodRequestType } from '../../generated/prisma/client';
import { checkFoodQuantity } from './food-quantity';
import { FRACTION_NOT_ALLOWED, PARTIAL_ONLY_QUANTITY_TOO_LOW } from './foods.constants';

const { TOTAL_ONLY, PARTIAL_ONLY, TOTAL_OR_PARTIAL } = FoodRequestType;

describe('checkFoodQuantity', () => {
  it('rejects a fraction when the unit does not allow it', () => {
    expect(checkFoodQuantity(2.5, false, TOTAL_OR_PARTIAL)).toBe(FRACTION_NOT_ALLOWED);
  });

  it('accepts a fraction when the unit allows it', () => {
    expect(checkFoodQuantity(2.5, true, TOTAL_OR_PARTIAL)).toBeNull();
  });

  it('accepts any positive quantity for total-only foods', () => {
    expect(checkFoodQuantity(1, false, TOTAL_ONLY)).toBeNull();
  });

  it('rejects partial-only with a single whole unit', () => {
    expect(checkFoodQuantity(1, false, PARTIAL_ONLY)).toBe(PARTIAL_ONLY_QUANTITY_TOO_LOW);
  });

  it('accepts partial-only with two whole units', () => {
    expect(checkFoodQuantity(2, false, PARTIAL_ONLY)).toBeNull();
  });

  it('rejects partial-only with the smallest fraction', () => {
    expect(checkFoodQuantity(0.01, true, PARTIAL_ONLY)).toBe(PARTIAL_ONLY_QUANTITY_TOO_LOW);
  });

  it('accepts partial-only with two hundredths', () => {
    expect(checkFoodQuantity(0.02, true, PARTIAL_ONLY)).toBeNull();
  });
});
