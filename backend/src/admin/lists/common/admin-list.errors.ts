import { ConflictException, NotFoundException } from '@nestjs/common';

import { Prisma } from '../../../../generated/prisma/client';

export const DUPLICATE_NAME = 'DUPLICATE_NAME';
export const DUPLICATE_ABBREVIATION = 'DUPLICATE_ABBREVIATION';
export const OPTION_IN_USE = 'OPTION_IN_USE';
export const SYSTEM_REASON_PROTECTED = 'SYSTEM_REASON_PROTECTED';
export const FRACTION_IN_USE = 'FRACTION_IN_USE';

export const conflict = (code: string, message: string) => new ConflictException({ code, message });

export const optionNotFound = () => new NotFoundException('Option not found.');

export function translatePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = JSON.stringify(error.meta ?? {});
      throw target.includes('abbreviation')
        ? conflict(DUPLICATE_ABBREVIATION, 'Abbreviation already registered.')
        : conflict(DUPLICATE_NAME, 'Name already registered.');
    }
    if (error.code === 'P2003') {
      throw conflict(OPTION_IN_USE, 'Option is in use.');
    }
  }
  throw error;
}
