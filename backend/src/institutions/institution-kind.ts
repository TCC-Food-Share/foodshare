import { Prisma } from '../../generated/prisma/client';
import { ROLE, type RoleName } from '../auth/roles.constants';

export const INSTITUTION_KIND = {
  ESTABLISHMENT: 'ESTABLISHMENT',
  BENEFICIARY_ENTITY: 'BENEFICIARY_ENTITY',
} as const;

export type InstitutionKind = (typeof INSTITUTION_KIND)[keyof typeof INSTITUTION_KIND];

export const INSTITUTION_KINDS = Object.values(INSTITUTION_KIND);

export const INSTITUTION_ROLE: Record<InstitutionKind, RoleName> = {
  ESTABLISHMENT: ROLE.ESTABLISHMENT,
  BENEFICIARY_ENTITY: ROLE.BENEFICIARY_ENTITY,
};

export const INSTITUTION_INCLUDE = { user: true, address: true } as const;

export type InstitutionWithRelations = Prisma.EstablishmentGetPayload<{
  include: typeof INSTITUTION_INCLUDE;
}>;

export type InstitutionData = Pick<
  Prisma.EstablishmentUncheckedCreateInput,
  | 'companyName'
  | 'tradeName'
  | 'cnpj'
  | 'institutionalEmail'
  | 'institutionalPhone'
  | 'description'
  | 'userId'
  | 'addressId'
>;

export type InstitutionUpdateData = Pick<
  Prisma.EstablishmentUpdateInput,
  'tradeName' | 'institutionalEmail' | 'institutionalPhone' | 'description' | 'deleted'
>;

export function createInstitution(
  tx: Prisma.TransactionClient,
  kind: InstitutionKind,
  data: InstitutionData,
): Promise<InstitutionWithRelations> {
  return kind === INSTITUTION_KIND.ESTABLISHMENT
    ? tx.establishment.create({ data, include: INSTITUTION_INCLUDE })
    : tx.beneficiaryEntity.create({ data, include: INSTITUTION_INCLUDE });
}

export function findInstitution(
  client: Pick<Prisma.TransactionClient, 'establishment' | 'beneficiaryEntity'>,
  kind: InstitutionKind,
  where: { id: number } | { userId: number },
): Promise<InstitutionWithRelations | null> {
  return kind === INSTITUTION_KIND.ESTABLISHMENT
    ? client.establishment.findUnique({ where, include: INSTITUTION_INCLUDE })
    : client.beneficiaryEntity.findUnique({ where, include: INSTITUTION_INCLUDE });
}

export function updateInstitution(
  tx: Prisma.TransactionClient,
  kind: InstitutionKind,
  id: number,
  data: InstitutionUpdateData,
): Promise<InstitutionWithRelations> {
  return kind === INSTITUTION_KIND.ESTABLISHMENT
    ? tx.establishment.update({ where: { id }, data, include: INSTITUTION_INCLUDE })
    : tx.beneficiaryEntity.update({ where: { id }, data, include: INSTITUTION_INCLUDE });
}
