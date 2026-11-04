import { describe, expect, it } from '@jest/globals';
import { ConflictException } from '@nestjs/common';

import { Prisma } from '../../../../generated/prisma/client';
import {
  DUPLICATE_ABBREVIATION,
  DUPLICATE_NAME,
  OPTION_IN_USE,
  translatePrismaError,
} from './admin-list.errors';

const prismaError = (code: string, meta?: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError('db', { code, clientVersion: 'test', meta });

const codeOf = (fn: () => never): unknown => {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ConflictException);
    return ((error as ConflictException).getResponse() as { code: string }).code;
  }
  return undefined;
};

describe('translatePrismaError', () => {
  it('maps a unique violation to DUPLICATE_NAME', () => {
    expect(codeOf(() => translatePrismaError(prismaError('P2002')))).toBe(DUPLICATE_NAME);
  });

  it('maps a unique violation on the abbreviation to DUPLICATE_ABBREVIATION', () => {
    const error = prismaError('P2002', { target: 'measurement_unit_abbreviation_normalized_key' });

    expect(codeOf(() => translatePrismaError(error))).toBe(DUPLICATE_ABBREVIATION);
  });

  it('maps a foreign key violation to OPTION_IN_USE', () => {
    expect(codeOf(() => translatePrismaError(prismaError('P2003')))).toBe(OPTION_IN_USE);
  });

  it('rethrows any other error', () => {
    const error = new Error('boom');

    expect(() => translatePrismaError(error)).toThrow(error);
  });
});
