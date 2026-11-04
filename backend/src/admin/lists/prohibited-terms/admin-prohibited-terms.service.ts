import { Injectable } from '@nestjs/common';

import { type AuditAdministrator, AuditService } from '../../../audit/audit.service';
import { normalizeText } from '../../../common/normalize-text';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  conflict,
  DUPLICATE_NAME,
  optionNotFound,
  translatePrismaError,
} from '../common/admin-list.errors';
import { hasDuplicate } from '../common/find-duplicate';
import { type Paginated, paginateInMemory } from '../common/paginate-in-memory';
import type {
  AdminProhibitedTermDto,
  ListProhibitedTermsQueryDto,
  SaveProhibitedTermDto,
} from './prohibited-term.dto';

const toDto = (row: { id: number; term: string }): AdminProhibitedTermDto => ({
  id: row.id,
  term: row.term,
  usageCount: 0,
});

@Injectable()
export class AdminProhibitedTermsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListProhibitedTermsQueryDto): Promise<Paginated<AdminProhibitedTermDto>> {
    const rows = await this.prisma.prohibitedTerm.findMany({ select: { id: true, term: true } });
    return paginateInMemory(rows.map(toDto), query, {
      searchText: (item) => [item.term],
      sortValues: { id: (item) => item.id, term: (item) => item.term },
    });
  }

  async create(
    admin: AuditAdministrator,
    dto: SaveProhibitedTermDto,
  ): Promise<AdminProhibitedTermDto> {
    const term = normalizeText(dto.term);
    return this.prisma
      .$transaction(async (tx) => {
        if (await hasDuplicate(tx, 'prohibited_term', 'term', term)) {
          throw conflict(DUPLICATE_NAME, 'Term already registered.');
        }
        const created = await tx.prohibitedTerm.create({
          data: { term, administratorId: admin.id },
        });
        await this.audit.record(tx, {
          administrator: admin,
          action: 'prohibited_term.create',
          entityType: 'ProhibitedTerm',
          entityId: created.id,
          details: { created: { term } },
        });
        return toDto(created);
      })
      .catch(translatePrismaError);
  }

  async update(
    admin: AuditAdministrator,
    id: number,
    dto: SaveProhibitedTermDto,
  ): Promise<AdminProhibitedTermDto> {
    const term = normalizeText(dto.term);
    return this.prisma
      .$transaction(async (tx) => {
        const before = await tx.prohibitedTerm.findUnique({ where: { id } });
        if (!before) throw optionNotFound();
        if (await hasDuplicate(tx, 'prohibited_term', 'term', term, id)) {
          throw conflict(DUPLICATE_NAME, 'Term already registered.');
        }
        const updated = await tx.prohibitedTerm.update({ where: { id }, data: { term } });
        await this.audit.record(tx, {
          administrator: admin,
          action: 'prohibited_term.update',
          entityType: 'ProhibitedTerm',
          entityId: id,
          details: { before: { term: before.term }, after: { term } },
        });
        return toDto(updated);
      })
      .catch(translatePrismaError);
  }

  async remove(admin: AuditAdministrator, id: number): Promise<void> {
    await this.prisma
      .$transaction(async (tx) => {
        const term = await tx.prohibitedTerm.findUnique({ where: { id } });
        if (!term) throw optionNotFound();
        await tx.prohibitedTerm.delete({ where: { id } });
        await this.audit.record(tx, {
          administrator: admin,
          action: 'prohibited_term.delete',
          entityType: 'ProhibitedTerm',
          entityId: id,
          details: { deleted: { term: term.term } },
        });
      })
      .catch(translatePrismaError);
  }
}
