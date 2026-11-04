import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../../generated/prisma/client';
import { type AuditAdministrator, AuditService } from '../../../audit/audit.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  conflict,
  DUPLICATE_NAME,
  OPTION_IN_USE,
  optionNotFound,
  SYSTEM_REASON_PROTECTED,
  translatePrismaError,
} from '../common/admin-list.errors';
import { hasDuplicate } from '../common/find-duplicate';
import { type Paginated, paginateInMemory } from '../common/paginate-in-memory';
import type {
  AdminCancellationReasonDto,
  ListCancellationReasonsQueryDto,
  SaveCancellationReasonDto,
} from './cancellation-reason.dto';

const INCLUDE = { _count: { select: { orders: true } } } as const;

type Row = { id: number; name: string; isSystem: boolean; _count: { orders: number } };

const toDto = (row: Row): AdminCancellationReasonDto => ({
  id: row.id,
  name: row.name,
  isSystem: row.isSystem,
  usageCount: row._count.orders,
});

const protectedReason = () =>
  conflict(SYSTEM_REASON_PROTECTED, 'System cancellation reasons cannot be changed.');

@Injectable()
export class AdminCancellationReasonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    query: ListCancellationReasonsQueryDto,
  ): Promise<Paginated<AdminCancellationReasonDto>> {
    const rows = await this.prisma.cancellationReason.findMany({ include: INCLUDE });
    return paginateInMemory(rows.map(toDto), query, {
      searchText: (item) => [item.name],
      sortValues: {
        id: (item) => item.id,
        name: (item) => item.name,
        usageCount: (item) => item.usageCount,
      },
    });
  }

  async create(
    admin: AuditAdministrator,
    dto: SaveCancellationReasonDto,
  ): Promise<AdminCancellationReasonDto> {
    return this.prisma
      .$transaction((tx) => this.createInTransaction(tx, admin, dto))
      .catch(translatePrismaError);
  }

  async createInTransaction(
    tx: Prisma.TransactionClient,
    admin: AuditAdministrator,
    dto: SaveCancellationReasonDto,
  ): Promise<AdminCancellationReasonDto> {
    if (await hasDuplicate(tx, 'cancellation_reason', 'name', dto.name)) {
      throw conflict(DUPLICATE_NAME, 'Reason name already registered.');
    }
    const reason = await tx.cancellationReason.create({
      data: { name: dto.name, isSystem: false, administratorId: admin.id },
      include: INCLUDE,
    });
    await this.audit.record(tx, {
      administrator: admin,
      action: 'cancellation_reason.create',
      entityType: 'CancellationReason',
      entityId: reason.id,
      details: { created: { name: reason.name } },
    });
    return toDto(reason);
  }

  async update(
    admin: AuditAdministrator,
    id: number,
    dto: SaveCancellationReasonDto,
  ): Promise<AdminCancellationReasonDto> {
    return this.prisma
      .$transaction(async (tx) => {
        const before = await tx.cancellationReason.findUnique({
          where: { id },
          include: INCLUDE,
        });
        if (!before) throw optionNotFound();
        if (before.isSystem) throw protectedReason();
        if (await hasDuplicate(tx, 'cancellation_reason', 'name', dto.name, id)) {
          throw conflict(DUPLICATE_NAME, 'Reason name already registered.');
        }
        const reason = await tx.cancellationReason.update({
          where: { id },
          data: { name: dto.name },
          include: INCLUDE,
        });
        await this.audit.record(tx, {
          administrator: admin,
          action: 'cancellation_reason.update',
          entityType: 'CancellationReason',
          entityId: id,
          details: { before: { name: before.name }, after: { name: reason.name } },
        });
        return toDto(reason);
      })
      .catch(translatePrismaError);
  }

  async remove(admin: AuditAdministrator, id: number): Promise<void> {
    await this.prisma
      .$transaction(async (tx) => {
        const reason = await tx.cancellationReason.findUnique({ where: { id }, include: INCLUDE });
        if (!reason) throw optionNotFound();
        if (reason.isSystem) throw protectedReason();
        if (reason._count.orders > 0) throw conflict(OPTION_IN_USE, 'Reason has orders.');
        await tx.cancellationReason.delete({ where: { id } });
        await this.audit.record(tx, {
          administrator: admin,
          action: 'cancellation_reason.delete',
          entityType: 'CancellationReason',
          entityId: id,
          details: { deleted: { name: reason.name } },
        });
      })
      .catch(translatePrismaError);
  }
}
