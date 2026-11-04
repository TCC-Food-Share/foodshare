import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { Prisma, SuggestionStatus, SuggestionType } from '../../../generated/prisma/client';
import { type AuditAdministrator, AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SUGGESTION_ALREADY_REVIEWED } from '../../suggestions/suggestions.constants';
import { AdminCancellationReasonsService } from '../lists/cancellation-reasons/admin-cancellation-reasons.service';
import { SaveCancellationReasonDto } from '../lists/cancellation-reasons/cancellation-reason.dto';
import { AdminCategoriesService } from '../lists/categories/admin-categories.service';
import { SaveCategoryDto } from '../lists/categories/category.dto';
import { conflict, optionNotFound, translatePrismaError } from '../lists/common/admin-list.errors';
import { type Paginated, paginateInMemory } from '../lists/common/paginate-in-memory';
import { AdminFoodItemsService } from '../lists/food-items/admin-food-items.service';
import { SaveFoodItemDto } from '../lists/food-items/food-item.dto';
import { AdminMeasurementUnitsService } from '../lists/measurement-units/admin-measurement-units.service';
import { SaveMeasurementUnitDto } from '../lists/measurement-units/measurement-unit.dto';
import type {
  AdminSuggestionDto,
  ApproveSuggestionDto,
  ListSuggestionsQueryDto,
} from './suggestion.dto';

const INSTITUTION_NAME = { select: { tradeName: true, companyName: true } } as const;

const INCLUDE = {
  requester: {
    select: { establishment: INSTITUTION_NAME, beneficiaryEntity: INSTITUTION_NAME },
  },
} as const;

type Row = Prisma.SuggestionGetPayload<{ include: typeof INCLUDE }>;

const toDto = (row: Row): AdminSuggestionDto => {
  const institution = row.requester.establishment ?? row.requester.beneficiaryEntity;
  return {
    id: row.id,
    type: row.type,
    text: row.text,
    status: row.status,
    requesterName: institution?.tradeName || institution?.companyName || '',
    createdAt: row.createdAt,
    reviewedAt: row.reviewedAt,
  };
};

async function validated<T extends object>(dtoClass: new () => T, plain: object): Promise<T> {
  const dto = plainToInstance(dtoClass, plain);
  const errors = await validate(dto);
  if (errors.length > 0) {
    throw new BadRequestException(
      errors.flatMap((error) => Object.values(error.constraints ?? {})),
    );
  }
  return dto;
}

@Injectable()
export class AdminSuggestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly categories: AdminCategoriesService,
    private readonly foodItems: AdminFoodItemsService,
    private readonly measurementUnits: AdminMeasurementUnitsService,
    private readonly cancellationReasons: AdminCancellationReasonsService,
  ) {}

  async list(query: ListSuggestionsQueryDto): Promise<Paginated<AdminSuggestionDto>> {
    const rows = await this.prisma.suggestion.findMany({
      where: { type: query.type, status: query.status },
      include: INCLUDE,
    });
    return paginateInMemory(rows.map(toDto), query, {
      searchText: (item) => [item.text, item.requesterName],
      sortValues: {
        id: (item) => item.id,
        type: (item) => item.type,
        text: (item) => item.text,
        status: (item) => item.status,
        requesterName: (item) => item.requesterName,
        createdAt: (item) => item.createdAt.getTime(),
      },
    });
  }

  async approve(
    admin: AuditAdministrator,
    id: number,
    dto: ApproveSuggestionDto,
  ): Promise<AdminSuggestionDto> {
    return this.prisma
      .$transaction(async (tx) => {
        const suggestion = await this.findPending(tx, id);
        const create = await this.prepareOption(suggestion, dto);
        await this.markReviewed(tx, admin, id, SuggestionStatus.APPROVED);
        const created = await create(tx, admin);
        await this.audit.record(tx, {
          administrator: admin,
          action: 'suggestion.approve',
          entityType: 'Suggestion',
          entityId: id,
          details: { suggestion: { type: suggestion.type, text: suggestion.text }, created },
        });
        return toDto(await tx.suggestion.findUniqueOrThrow({ where: { id }, include: INCLUDE }));
      })
      .catch(translatePrismaError);
  }

  async reject(admin: AuditAdministrator, id: number): Promise<AdminSuggestionDto> {
    return this.prisma.$transaction(async (tx) => {
      const suggestion = await this.findPending(tx, id);
      await this.markReviewed(tx, admin, id, SuggestionStatus.REJECTED);
      await this.audit.record(tx, {
        administrator: admin,
        action: 'suggestion.reject',
        entityType: 'Suggestion',
        entityId: id,
        details: { suggestion: { type: suggestion.type, text: suggestion.text } },
      });
      return toDto(await tx.suggestion.findUniqueOrThrow({ where: { id }, include: INCLUDE }));
    });
  }

  private async findPending(tx: Prisma.TransactionClient, id: number) {
    const suggestion = await tx.suggestion.findUnique({ where: { id } });
    if (!suggestion) throw optionNotFound();
    if (suggestion.status !== SuggestionStatus.PENDING) throw alreadyReviewed();
    return suggestion;
  }

  private async markReviewed(
    tx: Prisma.TransactionClient,
    admin: AuditAdministrator,
    id: number,
    status: SuggestionStatus,
  ): Promise<void> {
    const { count } = await tx.suggestion.updateMany({
      where: { id, status: SuggestionStatus.PENDING },
      data: { status, reviewerId: admin.id, reviewedAt: new Date() },
    });
    if (count === 0) throw alreadyReviewed();
  }

  private async prepareOption(
    suggestion: { type: SuggestionType; text: string },
    dto: ApproveSuggestionDto,
  ): Promise<(tx: Prisma.TransactionClient, admin: AuditAdministrator) => Promise<object>> {
    const name = dto.text ?? suggestion.text;
    switch (suggestion.type) {
      case SuggestionType.CATEGORY: {
        const option = await validated(SaveCategoryDto, { name });
        return (tx, admin) => this.categories.createInTransaction(tx, admin, option);
      }
      case SuggestionType.FOOD_CATALOG_ITEM: {
        const option = await validated(SaveFoodItemDto, { name, categoryId: dto.categoryId });
        return (tx, admin) => this.foodItems.createInTransaction(tx, admin, option);
      }
      case SuggestionType.MEASUREMENT_UNIT: {
        const option = await validated(SaveMeasurementUnitDto, {
          name,
          abbreviation: dto.abbreviation,
          allowsFraction: dto.allowsFraction,
        });
        return (tx, admin) => this.measurementUnits.createInTransaction(tx, admin, option);
      }
      case SuggestionType.CANCELLATION_REASON: {
        const option = await validated(SaveCancellationReasonDto, { name });
        return (tx, admin) => this.cancellationReasons.createInTransaction(tx, admin, option);
      }
    }
  }
}

const alreadyReviewed = () =>
  conflict(SUGGESTION_ALREADY_REVIEWED, 'Suggestion was already reviewed.');
