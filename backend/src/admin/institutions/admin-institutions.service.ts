import { Injectable } from '@nestjs/common';

import { OrderCancelledBy, Prisma } from '../../../generated/prisma/client';
import type { DeletionImpact } from '../../account-deletion/account-deletion.service';
import { AccountDeletionService } from '../../account-deletion/account-deletion.service';
import {
  lockBeneficiaryEntityForUpdate,
  lockEstablishmentForUpdate,
} from '../../account-deletion/institution-locks';
import { type AuditAdministrator, AuditService } from '../../audit/audit.service';
import { normalizeText } from '../../common/normalize-text';
import type { ValidatedImage } from '../../files/image-file.pipe';
import { ImageStorageService } from '../../files/image-storage.service';
import {
  findInstitution,
  INSTITUTION_KIND,
  type InstitutionKind,
  type InstitutionWithRelations,
} from '../../institutions/institution-kind';
import {
  type InstitutionCreateInput,
  InstitutionRegistrationService,
} from '../../institutions/institution-registration.service';
import { assertSelectableReason } from '../../orders/cancellation-reason';
import { PrismaService } from '../../prisma/prisma.service';
import { type Paginated, paginateInMemory } from '../lists/common/paginate-in-memory';
import type {
  AdminInstitutionFoodDto,
  AdminInstitutionOrderDto,
  AdminInstitutionProfileDto,
  AdminInstitutionRowDto,
  AdminPageQueryDto,
  AdminUpdateInstitutionDto,
  ListAdminInstitutionsQueryDto,
} from './admin-institution.dto';
import {
  cancellationReasonWithoutDelete,
  institutionDataAlreadyRegistered,
  institutionNotFound,
} from './institution.errors';
import { institutionActivity, institutionFoods, institutionOrders } from './institution-activity';

const AUDIT = {
  ESTABLISHMENT: { entityType: 'Establishment', prefix: 'establishment' },
  BENEFICIARY_ENTITY: { entityType: 'BeneficiaryEntity', prefix: 'beneficiary_entity' },
} as const satisfies Record<InstitutionKind, { entityType: string; prefix: string }>;

const ROW_SELECT = {
  id: true,
  companyName: true,
  tradeName: true,
  cnpj: true,
  institutionalEmail: true,
  institutionalPhone: true,
  description: true,
  deleted: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      personalPhone: true,
      image: true,
      emailVerified: true,
    },
  },
  address: {
    select: {
      postalCode: true,
      street: true,
      number: true,
      complement: true,
      city: true,
      state: true,
    },
  },
} satisfies Prisma.EstablishmentSelect;

type Row = Prisma.EstablishmentGetPayload<{ select: typeof ROW_SELECT }>;

interface SearchableRow extends AdminInstitutionRowDto {
  searchText: string[];
  searchDigits: string[];
}

const registeredOn = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const digitsOf = (value: string | null | undefined) => (value ?? '').replace(/\D/g, '');

const NUMERIC_TERM = /^[\d\s()./-]+$/;

function matches(row: SearchableRow, search: string): boolean {
  const term = normalizeText(search);
  if (row.searchText.some((text) => normalizeText(text).includes(term))) return true;
  const digits = digitsOf(search);
  return (
    NUMERIC_TERM.test(search) &&
    digits.length > 0 &&
    row.searchDigits.some((text) => text.includes(digits))
  );
}

@Injectable()
export class AdminInstitutionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ImageStorageService,
    private readonly audit: AuditService,
    private readonly registration: InstitutionRegistrationService,
    private readonly accountDeletion: AccountDeletionService,
  ) {}

  /** RF47, RF57, RF58 and DT53. */
  async list(query: ListAdminInstitutionsQueryDto): Promise<Paginated<AdminInstitutionRowDto>> {
    const deletedWhere = query.status === undefined ? {} : { deleted: query.status === 'deleted' };
    const [establishments, entities] = await Promise.all([
      query.type === INSTITUTION_KIND.BENEFICIARY_ENTITY
        ? ([] as Row[])
        : this.prisma.establishment.findMany({ where: deletedWhere, select: ROW_SELECT }),
      query.type === INSTITUTION_KIND.ESTABLISHMENT
        ? ([] as Row[])
        : this.prisma.beneficiaryEntity.findMany({ where: deletedWhere, select: ROW_SELECT }),
    ]);

    let rows = [
      ...establishments.map((row) => this.toRow(INSTITUTION_KIND.ESTABLISHMENT, row)),
      ...entities.map((row) => this.toRow(INSTITUTION_KIND.BENEFICIARY_ENTITY, row)),
    ];
    if (query.search) {
      const search = query.search;
      rows = rows.filter((row) => matches(row, search));
    }

    const result = paginateInMemory(
      rows,
      {
        page: query.page,
        pageSize: query.pageSize,
        sort: query.sort ?? 'createdAt',
        order: query.sort ? query.order : (query.order ?? 'desc'),
      },
      {
        searchText: () => [],
        sortValues: {
          type: (row) => row.kind,
          companyName: (row) => row.companyName,
          tradeName: (row) => row.tradeName ?? '',
          cnpj: (row) => row.cnpj,
          responsibleName: (row) => row.responsible.name,
          city: (row) => row.city,
          state: (row) => row.state,
          createdAt: (row) => row.createdAt.getTime(),
          deleted: (row) => row.deleted,
        },
      },
    );
    return {
      ...result,
      data: result.data.map(({ searchText: _text, searchDigits: _digits, ...row }) => row),
    };
  }

  /** RF41. The account starts unconfirmed and gets the code (DT39). */
  async create(
    actor: AuditAdministrator,
    kind: InstitutionKind,
    dto: InstitutionCreateInput,
    image: ValidatedImage,
  ): Promise<AdminInstitutionProfileDto> {
    const created = await this.registration.register(kind, dto, image, {
      conflict: institutionDataAlreadyRegistered,
      inTransaction: (tx, institution) =>
        this.audit.record(tx, {
          administrator: actor,
          action: `${AUDIT[kind].prefix}.create`,
          entityType: AUDIT[kind].entityType,
          entityId: institution.id,
          details: {
            companyName: institution.companyName,
            cnpj: institution.cnpj,
            email: institution.user.email,
          },
        }),
    });
    return this.getProfile(kind, created.id);
  }

  /** RF48, RF57 and DT51. */
  async getProfile(kind: InstitutionKind, id: number): Promise<AdminInstitutionProfileDto> {
    const institution = await this.require(kind, id);
    const activity = await institutionActivity(this.prisma, kind, id);
    return {
      kind,
      id: institution.id,
      companyName: institution.companyName,
      tradeName: institution.tradeName,
      cnpj: institution.cnpj,
      institutionalEmail: institution.institutionalEmail,
      institutionalPhone: institution.institutionalPhone,
      description: institution.description,
      image: this.storage.toUrl(institution.user.image),
      address: {
        postalCode: institution.address.postalCode,
        street: institution.address.street,
        number: institution.address.number,
        complement: institution.address.complement,
        city: institution.address.city,
        state: institution.address.state,
      },
      responsible: {
        userId: institution.user.id,
        name: institution.user.name,
        email: institution.user.email,
        personalPhone: institution.user.personalPhone,
      },
      createdAt: institution.createdAt,
      deleted: institution.deleted,
      emailVerified: institution.user.emailVerified,
      activity,
    };
  }

  async listFoods(
    id: number,
    query: AdminPageQueryDto,
  ): Promise<Paginated<AdminInstitutionFoodDto>> {
    await this.require(INSTITUTION_KIND.ESTABLISHMENT, id);
    return institutionFoods(this.prisma, id, query);
  }

  async listOrders(
    kind: InstitutionKind,
    id: number,
    query: AdminPageQueryDto,
  ): Promise<Paginated<AdminInstitutionOrderDto>> {
    await this.require(kind, id);
    return institutionOrders(this.prisma, kind, id, query);
  }

  async impact(kind: InstitutionKind, id: number): Promise<DeletionImpact> {
    await this.require(kind, id);
    return this.accountDeletion.impact(
      kind === INSTITUTION_KIND.ESTABLISHMENT
        ? { establishmentId: id }
        : { beneficiaryEntityId: id },
    );
  }

  /** RF44, with the soft delete (DT49) and the restore (DT50) through the `deleted` field. */
  async update(
    actor: AuditAdministrator,
    kind: InstitutionKind,
    id: number,
    dto: AdminUpdateInstitutionDto,
    image?: ValidatedImage,
  ): Promise<AdminInstitutionProfileDto> {
    const { deleted, cancellationReasonId, ...fields } = dto;
    if (cancellationReasonId !== undefined && deleted !== true) {
      throw cancellationReasonWithoutDelete();
    }

    const current = await this.require(kind, id);
    if (deleted === true && !current.deleted) {
      await assertSelectableReason(this.prisma, cancellationReasonId);
    }

    const audit = (
      tx: Prisma.TransactionClient,
      action: string,
      details: Record<string, unknown>,
    ) =>
      this.audit.record(tx, {
        administrator: actor,
        action: `${AUDIT[kind].prefix}.${action}`,
        entityType: AUDIT[kind].entityType,
        entityId: id,
        details,
      });

    await this.registration.update(kind, current, fields, image, {
      conflict: institutionDataAlreadyRegistered,
      beforeUpdate: async (tx) => {
        if (deleted === true && cancellationReasonId !== undefined) {
          await this.softDelete(tx, kind, current, cancellationReasonId, audit);
        }
        if (deleted === false) await this.restore(tx, kind, current, audit);
      },
      afterUpdate: async (tx, changes) => {
        if (changes) await audit(tx, 'update', { ...changes });
      },
    });

    return this.getProfile(kind, id);
  }

  private async softDelete(
    tx: Prisma.TransactionClient,
    kind: InstitutionKind,
    institution: InstitutionWithRelations,
    cancellationReasonId: number,
    audit: (
      tx: Prisma.TransactionClient,
      action: string,
      details: Record<string, unknown>,
    ) => Promise<void>,
  ): Promise<void> {
    const cancellation = { cancellationReasonId, cancelledBy: OrderCancelledBy.ADMINISTRATOR };
    const result =
      kind === INSTITUTION_KIND.ESTABLISHMENT
        ? await this.accountDeletion.closeEstablishment(tx, institution.id, cancellation)
        : await this.accountDeletion.closeBeneficiaryEntity(tx, institution.id, cancellation);
    if (!result.closed) return;

    await this.accountDeletion.closeUser(tx, institution.userId);
    await audit(tx, 'soft_delete', {
      cancellationReasonId,
      rejectedOrders: result.rejectedOrders,
      cancelledOrders: result.cancelledOrders,
    });
  }

  private async restore(
    tx: Prisma.TransactionClient,
    kind: InstitutionKind,
    institution: InstitutionWithRelations,
    audit: (
      tx: Prisma.TransactionClient,
      action: string,
      details: Record<string, unknown>,
    ) => Promise<void>,
  ): Promise<void> {
    const locked =
      kind === INSTITUTION_KIND.ESTABLISHMENT
        ? await lockEstablishmentForUpdate(tx, institution.id)
        : await lockBeneficiaryEntityForUpdate(tx, institution.id);
    if (!locked?.deleted) return;

    if (kind === INSTITUTION_KIND.ESTABLISHMENT) {
      await tx.establishment.update({ where: { id: institution.id }, data: { deleted: false } });
    } else {
      await tx.beneficiaryEntity.update({
        where: { id: institution.id },
        data: { deleted: false },
      });
    }
    await tx.user.update({ where: { id: institution.userId }, data: { deleted: false } });
    await audit(tx, 'restore', {});
  }

  private async require(kind: InstitutionKind, id: number): Promise<InstitutionWithRelations> {
    const institution = await findInstitution(this.prisma, kind, { id });
    if (!institution) throw institutionNotFound();
    return institution;
  }

  private toRow(kind: InstitutionKind, row: Row): SearchableRow {
    const { user, address } = row;
    return {
      kind,
      id: row.id,
      image: this.storage.toUrl(user.image),
      companyName: row.companyName,
      tradeName: row.tradeName,
      cnpj: row.cnpj,
      institutionalEmail: row.institutionalEmail,
      institutionalPhone: row.institutionalPhone,
      responsible: {
        userId: user.id,
        name: user.name,
        email: user.email,
        personalPhone: user.personalPhone,
      },
      city: address.city,
      state: address.state,
      createdAt: row.createdAt,
      deleted: row.deleted,
      emailVerified: user.emailVerified,
      searchText: [
        row.companyName,
        row.tradeName ?? '',
        row.cnpj,
        row.institutionalEmail,
        row.institutionalPhone,
        user.name,
        user.email,
        user.personalPhone ?? '',
        row.description,
        address.postalCode,
        address.street,
        address.number,
        address.complement ?? '',
        address.city,
        address.state,
        registeredOn.format(row.createdAt),
      ],
      searchDigits: [
        digitsOf(row.cnpj),
        digitsOf(row.institutionalPhone),
        digitsOf(user.personalPhone),
        digitsOf(address.postalCode),
      ],
    };
  }
}
