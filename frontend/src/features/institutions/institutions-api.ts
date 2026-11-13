import { INSTITUTION_KINDS, type InstitutionKind } from '@/features/institutions/institution-kind';
import { api, ApiError } from '@/lib/api';

export interface InstitutionListItem {
  id: number;
  name: string;
  image: string | null;
  city: string;
  state: string;
}

export interface InstitutionPublicProfile extends InstitutionListItem {
  description: string;
}

export interface PaginatedInstitutions {
  data: InstitutionListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InstitutionFilters {
  [key: string]: string | number | undefined;
  search?: string;
  city?: string;
  state?: string;
  page?: number;
  pageSize?: number;
}

export const listInstitutions = (kind: InstitutionKind, filters: InstitutionFilters) =>
  api.get<PaginatedInstitutions>(INSTITUTION_KINDS[kind].apiPath, { query: filters });

export const getInstitution = (kind: InstitutionKind, id: number) =>
  api.get<InstitutionPublicProfile>(`${INSTITUTION_KINDS[kind].apiPath}/${id}`);

export const institutionKey = (kind: InstitutionKind, id: number) =>
  ['institutions', kind, 'profile', id] as const;

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}
