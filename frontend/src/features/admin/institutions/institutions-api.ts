import {
  type AdminInstitutionKind,
  kindToApiSegment,
} from '@/features/admin/institutions/institution-kind';
import type { AdminListParams, Paginated } from '@/features/admin/lists/list-api';
import type { SignUpPayload } from '@/features/auth/sign-up/sign-up-api';
import { api, ApiError } from '@/lib/api';
import { toFormData } from '@/lib/form-data';

export interface AdminInstitutionResponsible {
  userId: number;
  name: string;
  email: string;
  personalPhone: string | null;
}

export interface AdminInstitutionRow {
  kind: AdminInstitutionKind;
  id: number;
  image: string | null;
  companyName: string;
  tradeName: string | null;
  cnpj: string;
  institutionalEmail: string;
  institutionalPhone: string;
  responsible: AdminInstitutionResponsible;
  city: string;
  state: string;
  createdAt: string;
  deleted: boolean;
  emailVerified: boolean;
}

export interface InstitutionActivity {
  foods: { active: number; reserved: number; inactive: number; deleted: number } | null;
  orders: {
    pending: number;
    inProgress: number;
    rejected: number;
    donated: number;
    cancelled: number;
  };
}

export interface AdminInstitutionProfile {
  kind: AdminInstitutionKind;
  id: number;
  companyName: string;
  tradeName: string | null;
  cnpj: string;
  institutionalEmail: string;
  institutionalPhone: string;
  description: string;
  image: string | null;
  address: {
    postalCode: string;
    street: string;
    number: string;
    complement: string | null;
    city: string;
    state: string;
  };
  responsible: AdminInstitutionResponsible;
  createdAt: string;
  deleted: boolean;
  emailVerified: boolean;
  activity: InstitutionActivity;
}

export interface AdminInstitutionFood {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  expirationDate: string;
  status: string;
  deleted: boolean;
}

export interface AdminInstitutionOrder {
  id: number;
  foodName: string;
  counterpartName: string;
  quantity: number;
  unit: string;
  orderDate: string;
  status: string;
  deleted: boolean;
}

export interface AdminInstitutionChanges {
  tradeName?: string;
  name?: string;
  personalPhone?: string;
  institutionalPhone?: string;
  institutionalEmail?: string;
  description?: string;
  address?: SignUpPayload['address'];
  deleted?: boolean;
  cancellationReasonId?: number;
}

export interface PageParams {
  page: number;
  pageSize: number;
}

export interface CancellationReasonOption {
  id: number;
  name: string;
}

const BASE = '/admin/institutions';

export const INSTITUTIONS_QUERY_KEY = ['admin', 'institutions'] as const;

const path = (kind: AdminInstitutionKind, id: number) => `${BASE}/${kindToApiSegment(kind)}/${id}`;

export const institutionsApi = {
  list: (params: AdminListParams) =>
    api.get<Paginated<AdminInstitutionRow>>(BASE, { query: params }),
  create: (kind: AdminInstitutionKind, payload: SignUpPayload, image: File) =>
    api.post<AdminInstitutionProfile>(
      `${BASE}/${kindToApiSegment(kind)}`,
      toFormData(payload, { image }),
    ),
  get: (kind: AdminInstitutionKind, id: number) => api.get<AdminInstitutionProfile>(path(kind, id)),
  update: (
    kind: AdminInstitutionKind,
    id: number,
    changes: AdminInstitutionChanges,
    image: File | null,
  ) =>
    api.patch<AdminInstitutionProfile>(
      path(kind, id),
      toFormData(changes, { image }, { keepEmpty: ['tradeName'] }),
    ),
  /** RF45, RF46: only for an institution already soft deleted (DT54). */
  remove: (kind: AdminInstitutionKind, id: number) => api.delete(path(kind, id)),
  impact: (kind: AdminInstitutionKind, id: number) =>
    api.get<{ pendingOrders: number; inProgressOrders: number }>(`${path(kind, id)}/impact`),
  foods: (id: number, params: PageParams) =>
    api.get<Paginated<AdminInstitutionFood>>(`${BASE}/establishments/${id}/foods`, {
      query: { ...params },
    }),
  orders: (kind: AdminInstitutionKind, id: number, params: PageParams) =>
    api.get<Paginated<AdminInstitutionOrder>>(`${path(kind, id)}/orders`, {
      query: { ...params },
    }),
  cancellationReasonOptions: () =>
    api.get<CancellationReasonOption[]>('/admin/cancellation-reasons/options'),
};

export const DUPLICATE_FIELD_MESSAGES: Record<string, string> = {
  cnpj: 'Este CNPJ já está cadastrado.',
  institutionalEmail: 'Este e-mail institucional já está cadastrado.',
  institutionalPhone: 'Este celular institucional já está cadastrado.',
  email: 'Este e-mail já está cadastrado.',
  personalPhone: 'Este celular já está cadastrado.',
};

export const CANCELLATION_REASON_MESSAGES: Record<string, string> = {
  CANCELLATION_REASON_REQUIRED: 'Escolha o motivo da exclusão.',
  INVALID_CANCELLATION_REASON: 'Este motivo não pode ser usado. Escolha outro.',
};

export const INSTITUTION_ERROR_MESSAGES: Record<string, string> = {
  INSTITUTION_NOT_SOFT_DELETED:
    'Esta instituição não está mais excluída logicamente. Atualize a página e confira a situação.',
};

/** Fields named by `INSTITUTION_DATA_ALREADY_REGISTERED`, or an empty list for any other error. */
export function duplicateFields(error: unknown): string[] {
  if (!(error instanceof ApiError) || error.status !== 409) return [];
  const body = error.body;
  if (!body || typeof body !== 'object' || !('fields' in body) || !Array.isArray(body.fields)) {
    return [];
  }
  return body.fields.filter((field): field is string => typeof field === 'string');
}

export function errorCode(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  const body = error.body;
  return body && typeof body === 'object' && 'code' in body && typeof body.code === 'string'
    ? body.code
    : null;
}
