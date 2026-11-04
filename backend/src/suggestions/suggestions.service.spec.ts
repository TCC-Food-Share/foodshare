import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';

import { Prisma, SuggestionStatus, SuggestionType } from '../../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { SuggestionsService } from './suggestions.service';

const sqlText = (args: unknown[]) => {
  const [strings, ...values] = args as [readonly string[], ...unknown[]];
  return [
    ...strings,
    ...values.map((value) => (value instanceof Prisma.Sql ? value.sql : String(value))),
  ].join(' ');
};

describe('SuggestionsService', () => {
  const create = jest.fn<(args: { data: Record<string, unknown> }) => Promise<unknown>>();
  const $queryRaw = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const tx = { suggestion: { create }, $queryRaw };
  const prisma = {
    $transaction: jest.fn((cb: (client: typeof tx) => Promise<unknown>) => cb(tx)),
  } as unknown as PrismaService;
  const service = new SuggestionsService(prisma);

  let matchingQueries: string[];

  const conflictCode = async (promise: Promise<unknown>) => {
    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConflictException);
    return ((error as ConflictException).getResponse() as { code: string }).code;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    matchingQueries = [];
    $queryRaw.mockImplementation((...args: unknown[]) => {
      const sql = sqlText(args);
      return Promise.resolve(matchingQueries.some((part) => sql.includes(part)) ? [{ id: 1 }] : []);
    });
    create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 5,
        ...data,
        status: SuggestionStatus.PENDING,
        createdAt: new Date('2026-11-04T12:00:00.000Z'),
      }),
    );
  });

  it('creates a pending suggestion linked to the requester', async () => {
    await expect(
      service.create(7, { type: SuggestionType.FOOD_CATALOG_ITEM, text: 'Pão de queijo' }),
    ).resolves.toEqual({
      id: 5,
      type: SuggestionType.FOOD_CATALOG_ITEM,
      text: 'Pão de queijo',
      status: SuggestionStatus.PENDING,
      createdAt: new Date('2026-11-04T12:00:00.000Z'),
    });
    expect(create).toHaveBeenCalledWith({
      data: { type: SuggestionType.FOOD_CATALOG_ITEM, text: 'Pão de queijo', requesterId: 7 },
    });
  });

  it.each([
    [SuggestionType.CATEGORY, '"category"'],
    [SuggestionType.FOOD_CATALOG_ITEM, '"food_catalog_item"'],
    [SuggestionType.MEASUREMENT_UNIT, '"measurement_unit"'],
    [SuggestionType.CANCELLATION_REASON, '"cancellation_reason"'],
  ])('rejects a %s that already exists in its list', async (type, table) => {
    matchingQueries = [table];
    await expect(conflictCode(service.create(7, { type, text: 'Existente' }))).resolves.toBe(
      'SUGGESTION_OPTION_EXISTS',
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('compares a unit suggestion with the abbreviation too', async () => {
    matchingQueries = ['"abbreviation"'];
    await expect(
      conflictCode(service.create(7, { type: SuggestionType.MEASUREMENT_UNIT, text: 'KG' })),
    ).resolves.toBe('SUGGESTION_OPTION_EXISTS');
  });

  it('rejects a text already pending for the same type', async () => {
    matchingQueries = ['FROM "suggestion"'];
    await expect(
      conflictCode(service.create(7, { type: SuggestionType.CATEGORY, text: 'congelados' })),
    ).resolves.toBe('SUGGESTION_ALREADY_PENDING');
    expect(create).not.toHaveBeenCalled();
  });

  it('only looks for pending suggestions of the same type', async () => {
    await service.create(7, { type: SuggestionType.CATEGORY, text: 'Congelados' });
    const pendingCall = $queryRaw.mock.calls.find((call) =>
      (call[0] as readonly string[]).join('').includes('FROM "suggestion"'),
    );
    expect(pendingCall?.slice(1)).toEqual([
      SuggestionType.CATEGORY,
      SuggestionStatus.PENDING,
      'Congelados',
    ]);
  });
});
