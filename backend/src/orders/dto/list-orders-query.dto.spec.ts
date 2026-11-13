import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ORDER_STATUS_NAMES } from '../orders.constants';
import { ListOrdersQueryDto } from './list-orders-query.dto';

async function statusErrors(status: string) {
  const errors = await validate(plainToInstance(ListOrdersQueryDto, { status }));
  return errors.filter((error) => error.property === 'status');
}

describe('ListOrdersQueryDto', () => {
  it.each(ORDER_STATUS_NAMES)('accepts "%s" as status', async (status) => {
    expect(await statusErrors(status)).toHaveLength(0);
  });

  it.each(['Aceito', 'Recebido', 'Revisar', 'qualquer'])(
    'rejects "%s" as status',
    async (status) => {
      expect(await statusErrors(status)).toHaveLength(1);
    },
  );

  describe('search', () => {
    const searchOf = async (search: unknown) => {
      const dto = plainToInstance(ListOrdersQueryDto, { search });
      const errors = (await validate(dto)).filter((error) => error.property === 'search');
      return { dto, errors };
    };

    it('trims the term', async () => {
      const { dto, errors } = await searchOf('  arroz  ');

      expect(errors).toHaveLength(0);
      expect(dto.search).toBe('arroz');
    });

    it('treats a blank term as absent', async () => {
      const { dto, errors } = await searchOf('   ');

      expect(errors).toHaveLength(0);
      expect(dto.search).toBeUndefined();
    });

    it('accepts 100 characters and rejects 101', async () => {
      expect((await searchOf('a'.repeat(100))).errors).toHaveLength(0);
      expect((await searchOf('a'.repeat(101))).errors).toHaveLength(1);
    });
  });

  describe('beneficiaryEntityId', () => {
    const idOf = async (beneficiaryEntityId: unknown) => {
      const dto = plainToInstance(ListOrdersQueryDto, { beneficiaryEntityId });
      const errors = (await validate(dto)).filter(
        (error) => error.property === 'beneficiaryEntityId',
      );
      return { dto, errors };
    };

    it('accepts a positive integer from the query string', async () => {
      const { dto, errors } = await idOf('7');

      expect(errors).toHaveLength(0);
      expect(dto.beneficiaryEntityId).toBe(7);
    });

    it.each(['abc', '0', '-1', '1.5'])('rejects "%s"', async (value) => {
      expect((await idOf(value)).errors).toHaveLength(1);
    });
  });
});
