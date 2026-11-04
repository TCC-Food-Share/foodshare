import { Injectable } from '@nestjs/common';

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
import {
  type AdminCategoryDto,
  type ListCategoriesQueryDto,
  type SaveCategoryDto,
} from './category.dto';

@Injectable()
export class AdminCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListCategoriesQueryDto): Promise<Paginated<AdminCategoryDto>> {
    const rows = await this.prisma.category.findMany({
      select: { id: true, name: true, _count: { select: { catalogItems: true } } },
    });
    const items = rows.map((row) => ({
      id: row.id,
      name: row.name,
      usageCount: row._count.catalogItems,
    }));
    return paginateInMemory(items, query, {
      searchText: (item) => [item.name],
      sortValues: {
        id: (item) => item.id,
        name: (item) => item.name,
        usageCount: (item) => item.usageCount,
      },
    });
  }

  async create(admin: AuditAdministrator, dto: SaveCategoryDto): Promise<AdminCategoryDto> {
    return this.prisma
      .$transaction((tx) => this.createInTransaction(tx, admin, dto))
      .catch(translatePrismaError);
  }

  async createInTransaction(
    tx: Prisma.TransactionClient,
    admin: AuditAdministrator,
    dto: SaveCategoryDto,
  ): Promise<AdminCategoryDto> {
    if (await hasDuplicate(tx, 'category', 'name', dto.name)) {
      throw conflict(DUPLICATE_NAME, 'Category name already registered.');
    }
    const category = await tx.category.create({
      data: { name: dto.name, administratorId: admin.id },
    });
    await this.audit.record(tx, {
      administrator: admin,
      action: 'category.create',
      entityType: 'Category',
      entityId: category.id,
      details: { created: { name: category.name } },
    });
    return { id: category.id, name: category.name, usageCount: 0 };
  }

  async update(
    admin: AuditAdministrator,
    id: number,
    dto: SaveCategoryDto,
  ): Promise<AdminCategoryDto> {
    return this.prisma
      .$transaction(async (tx) => {
        const before = await tx.category.findUnique({
          where: { id },
          include: { _count: { select: { catalogItems: true } } },
        });
        if (!before) throw optionNotFound();
        if (await hasDuplicate(tx, 'category', 'name', dto.name, id)) {
          throw conflict(DUPLICATE_NAME, 'Category name already registered.');
        }
        const category = await tx.category.update({ where: { id }, data: { name: dto.name } });
        await this.audit.record(tx, {
          administrator: admin,
          action: 'category.update',
          entityType: 'Category',
          entityId: id,
          details: { before: { name: before.name }, after: { name: category.name } },
        });
        return { id, name: category.name, usageCount: before._count.catalogItems };
      })
      .catch(translatePrismaError);
  }

  async remove(admin: AuditAdministrator, id: number): Promise<void> {
    await this.prisma
      .$transaction(async (tx) => {
        const category = await tx.category.findUnique({
          where: { id },
          include: { _count: { select: { catalogItems: true } } },
        });
        if (!category) throw optionNotFound();
        if (category._count.catalogItems > 0) {
          throw conflict(OPTION_IN_USE, 'Category has catalog items.');
        }
        await tx.category.delete({ where: { id } });
        await this.audit.record(tx, {
          administrator: admin,
          action: 'category.delete',
          entityType: 'Category',
          entityId: id,
          details: { deleted: { name: category.name } },
        });
      })
      .catch(translatePrismaError);
  }
}
