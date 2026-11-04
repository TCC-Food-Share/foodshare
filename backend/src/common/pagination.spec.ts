import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { ListCategoriesQueryDto } from '../admin/lists/categories/category.dto';
import { ListFoodsQueryDto } from '../foods/dto/list-foods-query.dto';
import { ListOrdersQueryDto } from '../orders/dto/list-orders-query.dto';
import { PAGE_SIZES } from './pagination';

const dtos = [
  ['foods', ListFoodsQueryDto],
  ['orders', ListOrdersQueryDto],
  ['admin lists', ListCategoriesQueryDto],
] as const;

describe.each(dtos)('pageSize in %s', (_name, Dto) => {
  const errorsFor = (pageSize: string) =>
    validateSync(plainToInstance(Dto, { pageSize })).filter((e) => e.property === 'pageSize');

  it.each(PAGE_SIZES)('accepts %i', (size) => {
    expect(errorsFor(String(size))).toHaveLength(0);
  });

  it.each(['1', '5', '30', '101', '0', '-10', 'abc'])('rejects %s', (size) => {
    expect(errorsFor(size)).not.toHaveLength(0);
  });
});
