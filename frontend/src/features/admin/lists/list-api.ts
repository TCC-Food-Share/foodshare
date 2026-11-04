import { api } from '@/lib/api';

export interface AdminListParams {
  [key: string]: string | number | undefined;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminCategory {
  id: number;
  name: string;
  usageCount: number;
}

export interface AdminFoodItem {
  id: number;
  name: string;
  category: { id: number; name: string };
  usageCount: number;
}

export interface AdminMeasurementUnit {
  id: number;
  name: string;
  abbreviation: string;
  allowsFraction: boolean;
  usageCount: number;
}

export interface AdminCancellationReason {
  id: number;
  name: string;
  isSystem: boolean;
  usageCount: number;
}

export interface AdminProhibitedTerm {
  id: number;
  term: string;
  usageCount: number;
}

export type AdminListResource =
  'categories' | 'food-items' | 'measurement-units' | 'cancellation-reasons' | 'prohibited-terms';

export function adminListApi<T, Payload>(resource: AdminListResource) {
  const base = `/admin/${resource}`;
  return {
    list: (params: AdminListParams) => api.get<Paginated<T>>(base, { query: params }),
    create: (payload: Payload) => api.post<T>(base, payload),
    update: (id: number, payload: Payload) => api.patch<T>(`${base}/${id}`, payload),
    remove: (id: number) => api.delete(`${base}/${id}`),
  };
}

export const ADMIN_LIST_ERROR_MESSAGES: Record<string, string> = {
  DUPLICATE_NAME: 'Já existe um registro com esse nome.',
  DUPLICATE_ABBREVIATION: 'Já existe uma unidade com essa sigla.',
  OPTION_IN_USE: 'Não é possível excluir: a opção está em uso.',
  SYSTEM_REASON_PROTECTED: 'Motivos de sistema não podem ser alterados.',
  FRACTION_IN_USE:
    'Há alimentos com quantidade fracionada nesta unidade. Ajuste-os antes de desmarcar a fração.',
};
