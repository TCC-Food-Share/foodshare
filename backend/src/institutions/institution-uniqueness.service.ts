import { ConflictException, Injectable } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';
import { INSTITUTION_KIND, type InstitutionKind } from './institution-kind';

export const INSTITUTION_UNIQUE_FIELDS = [
  'cnpj',
  'institutionalEmail',
  'institutionalPhone',
  'email',
  'personalPhone',
] as const;

export type InstitutionUniqueField = (typeof INSTITUTION_UNIQUE_FIELDS)[number];

export type InstitutionUniqueValues = Partial<Record<InstitutionUniqueField, string>>;

export interface UniquenessExclusion {
  kind: InstitutionKind;
  institutionId: number;
  userId: number;
}

type Client = Pick<
  Prisma.TransactionClient,
  'user' | 'establishment' | 'beneficiaryEntity' | '$executeRaw'
>;

// Arbitrary key shared by every transaction that writes a unique institutional field.
const INSTITUTION_UNIQUENESS_LOCK = 4_102_026;

const INSTITUTIONAL_FIELDS = ['cnpj', 'institutionalEmail', 'institutionalPhone'] as const;

type InstitutionalField = (typeof INSTITUTIONAL_FIELDS)[number];

export const touchesInstitutionalField = (values: InstitutionUniqueValues): boolean =>
  INSTITUTIONAL_FIELDS.some((field) => values[field] !== undefined);

const PUBLIC_FIELD_LABELS: Record<string, string> = {
  cnpj: 'CNPJ',
  institutionalEmail: 'institutional email',
  institutionalPhone: 'institutional phone',
  personal: 'personal email or phone',
};

/**
 * Public sign-up and profile edition: the personal email and phone collide as a single generic
 * "personal" field, so an anonymous caller cannot tell which one is taken.
 */
export function publicDuplicateConflict(fields: InstitutionUniqueField[]): ConflictException {
  const publicFields: string[] = fields.filter(
    (field) => field !== 'email' && field !== 'personalPhone',
  );
  if (fields.includes('email') || fields.includes('personalPhone')) publicFields.push('personal');
  if (publicFields.length === 0) {
    return new ConflictException('CNPJ, email or phone already registered.');
  }

  const labels = publicFields.map((field) => PUBLIC_FIELD_LABELS[field]);
  const list =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
  const verb = labels.length === 1 ? 'is' : 'are';
  const message = `${list} ${verb} already registered.`;
  return new ConflictException({
    message: message.charAt(0).toUpperCase() + message.slice(1),
    fields: publicFields,
  });
}

@Injectable()
export class InstitutionUniquenessService {
  /**
   * RN26 and DT52: CNPJ and institutional contacts are unique across establishments and entities
   * together, deleted ones included; personal email and phone across every user.
   */
  async findConflicts(
    client: Client,
    values: InstitutionUniqueValues,
    exclude?: UniquenessExclusion,
  ): Promise<InstitutionUniqueField[]> {
    const checks = await Promise.all([
      ...INSTITUTIONAL_FIELDS.map((field) =>
        this.institutionalTaken(client, field, values, exclude),
      ),
      values.email !== undefined
        ? client.user.findFirst({
            where: {
              email: { equals: values.email, mode: 'insensitive' },
              ...(exclude && { id: { not: exclude.userId } }),
            },
            select: { id: true },
          })
        : null,
      values.personalPhone !== undefined
        ? client.user.findFirst({
            where: {
              personalPhone: values.personalPhone,
              ...(exclude && { id: { not: exclude.userId } }),
            },
            select: { id: true },
          })
        : null,
    ]);

    return INSTITUTION_UNIQUE_FIELDS.filter((_, index) => Boolean(checks[index]));
  }

  /**
   * The unique constraints only hold within one table. Every transaction that writes CNPJ or an
   * institutional contact takes this lock and checks again before writing, so two sign-ups of
   * different kinds cannot both pass the check.
   */
  async lock(client: Client): Promise<void> {
    await client.$executeRaw`SELECT pg_advisory_xact_lock(${INSTITUTION_UNIQUENESS_LOCK})`;
  }

  private async institutionalTaken(
    client: Client,
    field: InstitutionalField,
    values: InstitutionUniqueValues,
    exclude?: UniquenessExclusion,
  ): Promise<boolean> {
    const value = values[field];
    if (value === undefined) return false;

    const notSelf = (kind: InstitutionKind) =>
      exclude?.kind === kind ? { id: { not: exclude.institutionId } } : {};

    const [establishment, entity] = await Promise.all([
      client.establishment.findFirst({
        where: { [field]: value, ...notSelf(INSTITUTION_KIND.ESTABLISHMENT) },
        select: { id: true },
      }),
      client.beneficiaryEntity.findFirst({
        where: { [field]: value, ...notSelf(INSTITUTION_KIND.BENEFICIARY_ENTITY) },
        select: { id: true },
      }),
    ]);
    return establishment !== null || entity !== null;
  }
}
