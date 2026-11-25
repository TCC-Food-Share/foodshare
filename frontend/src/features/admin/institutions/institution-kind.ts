export type AdminInstitutionKind = 'ESTABLISHMENT' | 'BENEFICIARY_ENTITY';

export const INSTITUTION_KIND_LABELS: Record<AdminInstitutionKind, string> = {
  ESTABLISHMENT: 'Estabelecimento',
  BENEFICIARY_ENTITY: 'Entidade beneficiária',
};

export const INSTITUTION_KINDS = Object.keys(INSTITUTION_KIND_LABELS) as AdminInstitutionKind[];

const SLUGS: Record<AdminInstitutionKind, string> = {
  ESTABLISHMENT: 'estabelecimentos',
  BENEFICIARY_ENTITY: 'entidades',
};

const API_SEGMENTS: Record<AdminInstitutionKind, string> = {
  ESTABLISHMENT: 'establishments',
  BENEFICIARY_ENTITY: 'beneficiary-entities',
};

export const kindToSlug = (kind: AdminInstitutionKind) => SLUGS[kind];

export const kindToApiSegment = (kind: AdminInstitutionKind) => API_SEGMENTS[kind];

export function slugToKind(slug: string | undefined): AdminInstitutionKind | null {
  const entry = Object.entries(SLUGS).find(([, value]) => value === slug);
  return entry ? (entry[0] as AdminInstitutionKind) : null;
}

export const INSTITUTIONS_PATH = '/admin/instituicoes';

export const institutionPath = (kind: AdminInstitutionKind, id: number) =>
  `${INSTITUTIONS_PATH}/${kindToSlug(kind)}/${id}`;
