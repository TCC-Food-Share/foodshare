import type { Role } from '@/features/auth/auth-context';

export type InstitutionKind = 'establishment' | 'beneficiary-entity';

interface InstitutionKindCopy {
  apiPath: string;
  basePath: string;
  title: string;
  subtitle: string;
  foundOne: string;
  foundMany: string;
  emptyTitle: string;
}

export const INSTITUTION_KINDS: Record<InstitutionKind, InstitutionKindCopy> = {
  establishment: {
    apiPath: '/establishments',
    basePath: '/estabelecimentos',
    title: 'Estabelecimentos',
    subtitle: 'Conheça os estabelecimentos que doam alimentos',
    foundOne: 'estabelecimento encontrado',
    foundMany: 'estabelecimentos encontrados',
    emptyTitle: 'Nenhum estabelecimento encontrado',
  },
  'beneficiary-entity': {
    apiPath: '/beneficiary-entities',
    basePath: '/entidades',
    title: 'Entidades',
    subtitle: 'Conheça as entidades beneficiárias que recebem doações',
    foundOne: 'entidade encontrada',
    foundMany: 'entidades encontradas',
    emptyTitle: 'Nenhuma entidade encontrada',
  },
};

export function oppositeKindOf(role: Role | null): InstitutionKind | null {
  if (role === 'beneficiary') return 'establishment';
  if (role === 'establishment') return 'beneficiary-entity';
  return null;
}

export function institutionProfilePath(kind: InstitutionKind, id: number): string {
  return `${INSTITUTION_KINDS[kind].basePath}/${id}`;
}

export function parseProfileId(value: string | undefined): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
