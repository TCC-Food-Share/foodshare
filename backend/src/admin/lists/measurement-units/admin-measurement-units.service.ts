import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../../generated/prisma/client';
import { type AuditAdministrator, AuditService } from '../../../audit/audit.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  conflict,
  DUPLICATE_ABBREVIATION,
  DUPLICATE_NAME,
  FRACTION_IN_USE,
  OPTION_IN_USE,
  optionNotFound,
  translatePrismaError,
} from '../common/admin-list.errors';
import { hasDuplicate } from '../common/find-duplicate';
import { type Paginated, paginateInMemory } from '../common/paginate-in-memory';
import type {
  AdminMeasurementUnitDto,
  ListMeasurementUnitsQueryDto,
  SaveMeasurementUnitDto,
} from './measurement-unit.dto';

const INCLUDE = { _count: { select: { foods: true } } } as const;

type Row = {
  id: number;
  name: string;
  abbreviation: string;
  allowsFraction: boolean;
  _count: { foods: number };
};

const toDto = (row: Row): AdminMeasurementUnitDto => ({
  id: row.id,
  name: row.name,
  abbreviation: row.abbreviation,
  allowsFraction: row.allowsFraction,
  usageCount: row._count.foods,
});

const snapshot = (row: Row) => ({
  name: row.name,
  abbreviation: row.abbreviation,
  allowsFraction: row.allowsFraction,
});

@Injectable()
export class AdminMeasurementUnitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListMeasurementUnitsQueryDto): Promise<Paginated<AdminMeasurementUnitDto>> {
    const rows = await this.prisma.measurementUnit.findMany({ include: INCLUDE });
    return paginateInMemory(rows.map(toDto), query, {
      searchText: (item) => [item.name, item.abbreviation],
      sortValues: {
        id: (item) => item.id,
        name: (item) => item.name,
        abbreviation: (item) => item.abbreviation,
        allowsFraction: (item) => item.allowsFraction,
        usageCount: (item) => item.usageCount,
      },
    });
  }

  async create(
    admin: AuditAdministrator,
    dto: SaveMeasurementUnitDto,
  ): Promise<AdminMeasurementUnitDto> {
    return this.prisma
      .$transaction((tx) => this.createInTransaction(tx, admin, dto))
      .catch(translatePrismaError);
  }

  async createInTransaction(
    tx: Prisma.TransactionClient,
    admin: AuditAdministrator,
    dto: SaveMeasurementUnitDto,
  ): Promise<AdminMeasurementUnitDto> {
    await this.ensureUnique(tx, dto);
    const unit = await tx.measurementUnit.create({
      data: { ...dto, administratorId: admin.id },
      include: INCLUDE,
    });
    await this.audit.record(tx, {
      administrator: admin,
      action: 'measurement_unit.create',
      entityType: 'MeasurementUnit',
      entityId: unit.id,
      details: { created: snapshot(unit) },
    });
    return toDto(unit);
  }

  async update(
    admin: AuditAdministrator,
    id: number,
    dto: SaveMeasurementUnitDto,
  ): Promise<AdminMeasurementUnitDto> {
    return this.prisma
      .$transaction(async (tx) => {
        const before = await tx.measurementUnit.findUnique({ where: { id }, include: INCLUDE });
        if (!before) throw optionNotFound();
        await this.ensureUnique(tx, dto, id);
        if (before.allowsFraction && !dto.allowsFraction) {
          const [{ count }] = await tx.$queryRaw<{ count: bigint }[]>`
            SELECT count(*) AS count FROM food
            WHERE "measurementUnitId" = ${id} AND deleted = false AND quantity <> trunc(quantity)
          `;
          if (count > 0n) {
            throw conflict(FRACTION_IN_USE, 'There are foods with fractional quantity.');
          }
        }
        const unit = await tx.measurementUnit.update({
          where: { id },
          data: dto,
          include: INCLUDE,
        });
        await this.audit.record(tx, {
          administrator: admin,
          action: 'measurement_unit.update',
          entityType: 'MeasurementUnit',
          entityId: id,
          details: { before: snapshot(before), after: snapshot(unit) },
        });
        return toDto(unit);
      })
      .catch(translatePrismaError);
  }

  async remove(admin: AuditAdministrator, id: number): Promise<void> {
    await this.prisma
      .$transaction(async (tx) => {
        const unit = await tx.measurementUnit.findUnique({ where: { id }, include: INCLUDE });
        if (!unit) throw optionNotFound();
        if (unit._count.foods > 0) throw conflict(OPTION_IN_USE, 'Unit has foods.');
        await tx.measurementUnit.delete({ where: { id } });
        await this.audit.record(tx, {
          administrator: admin,
          action: 'measurement_unit.delete',
          entityType: 'MeasurementUnit',
          entityId: id,
          details: { deleted: snapshot(unit) },
        });
      })
      .catch(translatePrismaError);
  }

  private async ensureUnique(
    tx: Prisma.TransactionClient,
    dto: SaveMeasurementUnitDto,
    excludeId?: number,
  ): Promise<void> {
    if (await hasDuplicate(tx, 'measurement_unit', 'name', dto.name, excludeId)) {
      throw conflict(DUPLICATE_NAME, 'Unit name already registered.');
    }
    if (await hasDuplicate(tx, 'measurement_unit', 'abbreviation', dto.abbreviation, excludeId)) {
      throw conflict(DUPLICATE_ABBREVIATION, 'Unit abbreviation already registered.');
    }
  }
}
