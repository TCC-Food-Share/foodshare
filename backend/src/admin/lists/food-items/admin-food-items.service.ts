import { BadRequestException, Injectable } from '@nestjs/common';

import { Prisma } from '../../../../generated/prisma/client';
import { type AuditAdministrator, AuditService } from '../../../audit/audit.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  conflict,
  DUPLICATE_NAME,
  OPTION_IN_USE,
  optionNotFound,
  translatePrismaError,
} from '../common/admin-list.errors';
import { hasDuplicate } from '../common/find-duplicate';
import { type Paginated, paginateInMemory } from '../common/paginate-in-memory';
import type { AdminFoodItemDto, ListFoodItemsQueryDto, SaveFoodItemDto } from './food-item.dto';

const INCLUDE = { category: true, _count: { select: { foods: true } } } as const;

type Row = {
  id: number;
  name: string;
  category: { id: number; name: string };
  _count: { foods: number };
};

const toDto = (row: Row): AdminFoodItemDto => ({
  id: row.id,
  name: row.name,
  category: { id: row.category.id, name: row.category.name },
  usageCount: row._count.foods,
});

const snapshot = (row: Row) => ({ name: row.name, categoryId: row.category.id });

@Injectable()
export class AdminFoodItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListFoodItemsQueryDto): Promise<Paginated<AdminFoodItemDto>> {
    const rows = await this.prisma.foodCatalogItem.findMany({ include: INCLUDE });
    return paginateInMemory(rows.map(toDto), query, {
      searchText: (item) => [item.name, item.category.name],
      sortValues: {
        id: (item) => item.id,
        name: (item) => item.name,
        category: (item) => item.category.name,
        usageCount: (item) => item.usageCount,
      },
    });
  }

  async create(admin: AuditAdministrator, dto: SaveFoodItemDto): Promise<AdminFoodItemDto> {
    return this.prisma
      .$transaction(async (tx) => {
        await this.ensureCategory(tx, dto.categoryId);
        if (await hasDuplicate(tx, 'food_catalog_item', 'name', dto.name)) {
          throw conflict(DUPLICATE_NAME, 'Catalog item name already registered.');
        }
        const item = await tx.foodCatalogItem.create({
          data: { name: dto.name, categoryId: dto.categoryId, administratorId: admin.id },
          include: INCLUDE,
        });
        await this.audit.record(tx, {
          administrator: admin,
          action: 'food_catalog_item.create',
          entityType: 'FoodCatalogItem',
          entityId: item.id,
          details: { created: snapshot(item) },
        });
        return toDto(item);
      })
      .catch(translatePrismaError);
  }

  async update(
    admin: AuditAdministrator,
    id: number,
    dto: SaveFoodItemDto,
  ): Promise<AdminFoodItemDto> {
    return this.prisma
      .$transaction(async (tx) => {
        const before = await tx.foodCatalogItem.findUnique({ where: { id }, include: INCLUDE });
        if (!before) throw optionNotFound();
        await this.ensureCategory(tx, dto.categoryId);
        if (await hasDuplicate(tx, 'food_catalog_item', 'name', dto.name, id)) {
          throw conflict(DUPLICATE_NAME, 'Catalog item name already registered.');
        }
        const item = await tx.foodCatalogItem.update({
          where: { id },
          data: { name: dto.name, categoryId: dto.categoryId },
          include: INCLUDE,
        });
        await this.audit.record(tx, {
          administrator: admin,
          action: 'food_catalog_item.update',
          entityType: 'FoodCatalogItem',
          entityId: id,
          details: { before: snapshot(before), after: snapshot(item) },
        });
        return toDto(item);
      })
      .catch(translatePrismaError);
  }

  async remove(admin: AuditAdministrator, id: number): Promise<void> {
    await this.prisma
      .$transaction(async (tx) => {
        const item = await tx.foodCatalogItem.findUnique({ where: { id }, include: INCLUDE });
        if (!item) throw optionNotFound();
        if (item._count.foods > 0) throw conflict(OPTION_IN_USE, 'Catalog item has foods.');
        await tx.foodCatalogItem.delete({ where: { id } });
        await this.audit.record(tx, {
          administrator: admin,
          action: 'food_catalog_item.delete',
          entityType: 'FoodCatalogItem',
          entityId: id,
          details: { deleted: snapshot(item) },
        });
      })
      .catch(translatePrismaError);
  }

  private async ensureCategory(tx: Prisma.TransactionClient, categoryId: number): Promise<void> {
    const category = await tx.category.findUnique({ where: { id: categoryId } });
    if (!category) throw new BadRequestException('Category not found.');
  }
}
