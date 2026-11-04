import { Injectable } from '@nestjs/common';

import { Prisma, SuggestionStatus, SuggestionType } from '../../generated/prisma/client';
import { conflict } from '../admin/lists/common/admin-list.errors';
import { hasDuplicate } from '../admin/lists/common/find-duplicate';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSuggestionDto, SuggestionResponseDto } from './suggestion.dto';
import { SUGGESTION_ALREADY_PENDING, SUGGESTION_OPTION_EXISTS } from './suggestions.constants';

type Tx = Prisma.TransactionClient;

const OPTION_EXISTS: Record<SuggestionType, (tx: Tx, text: string) => Promise<boolean>> = {
  [SuggestionType.CATEGORY]: (tx, text) => hasDuplicate(tx, 'category', 'name', text),
  [SuggestionType.FOOD_CATALOG_ITEM]: (tx, text) =>
    hasDuplicate(tx, 'food_catalog_item', 'name', text),
  [SuggestionType.MEASUREMENT_UNIT]: async (tx, text) =>
    (await hasDuplicate(tx, 'measurement_unit', 'name', text)) ||
    (await hasDuplicate(tx, 'measurement_unit', 'abbreviation', text)),
  [SuggestionType.CANCELLATION_REASON]: (tx, text) =>
    hasDuplicate(tx, 'cancellation_reason', 'name', text),
};

async function isAlreadyPending(tx: Tx, type: SuggestionType, text: string): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: number }[]>`
    SELECT id FROM "suggestion"
    WHERE "type" = ${type}::"SuggestionType"
      AND "status" = ${SuggestionStatus.PENDING}::"SuggestionStatus"
      AND lower(immutable_unaccent("text")) = lower(immutable_unaccent(${text}))
    LIMIT 1
  `;
  return rows.length > 0;
}

@Injectable()
export class SuggestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateSuggestionDto): Promise<SuggestionResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      if (await OPTION_EXISTS[dto.type](tx, dto.text)) {
        throw conflict(SUGGESTION_OPTION_EXISTS, 'Option already exists in this list.');
      }
      if (await isAlreadyPending(tx, dto.type, dto.text)) {
        throw conflict(SUGGESTION_ALREADY_PENDING, 'Option was already suggested.');
      }
      const suggestion = await tx.suggestion.create({
        data: { type: dto.type, text: dto.text, requesterId: userId },
      });
      return {
        id: suggestion.id,
        type: suggestion.type,
        text: suggestion.text,
        status: suggestion.status,
        createdAt: suggestion.createdAt,
      };
    });
  }
}
