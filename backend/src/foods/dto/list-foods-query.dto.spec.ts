import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ListFoodsQueryDto } from './list-foods-query.dto';

describe('ListFoodsQueryDto establishmentId', () => {
  const idOf = async (establishmentId: unknown) => {
    const dto = plainToInstance(ListFoodsQueryDto, { establishmentId });
    const errors = (await validate(dto)).filter((error) => error.property === 'establishmentId');
    return { dto, errors };
  };

  it('accepts a positive integer from the query string', async () => {
    const { dto, errors } = await idOf('4');

    expect(errors).toHaveLength(0);
    expect(dto.establishmentId).toBe(4);
  });

  it.each(['abc', '0', '-2', '2.5'])('rejects "%s"', async (value) => {
    expect((await idOf(value)).errors).toHaveLength(1);
  });
});
