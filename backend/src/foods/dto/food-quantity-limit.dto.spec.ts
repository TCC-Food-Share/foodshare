import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { FoodRequestType } from '../../../generated/prisma/client';
import { MAX_FOOD_QUANTITY } from '../foods.constants';
import { CreateFoodDto } from './create-food.dto';
import { QuantityImpactQueryDto, ReactivateFoodDto, UpdateFoodDto } from './update-food.dto';

const quantityErrors = async (cls: new () => object, plain: object) => {
  const errors = await validate(plainToInstance(cls, plain), { skipMissingProperties: true });
  return errors.filter((error) => error.property === 'quantity');
};

describe('food quantity limit', () => {
  const create = {
    catalogItemId: 1,
    measurementUnitId: 1,
    requestType: FoodRequestType.TOTAL_OR_PARTIAL,
    expirationDate: '2099-12-31',
  };
  const cases: [string, new () => object, object][] = [
    ['create', CreateFoodDto, create],
    ['update', UpdateFoodDto, {}],
    ['reactivate', ReactivateFoodDto, { expirationDate: '2099-12-31' }],
    ['impact', QuantityImpactQueryDto, {}],
  ];

  it.each(cases)('%s accepts the largest value the column holds', async (_name, cls, base) => {
    expect(await quantityErrors(cls, { ...base, quantity: MAX_FOOD_QUANTITY })).toHaveLength(0);
  });

  it.each(cases)('%s refuses a value above it', async (_name, cls, base) => {
    const errors = await quantityErrors(cls, { ...base, quantity: 100_000_000 });
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('max');
  });
});
