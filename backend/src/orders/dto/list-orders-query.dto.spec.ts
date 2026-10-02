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
});
