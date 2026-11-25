import type { AdminListParams, Paginated } from '@/features/admin/lists/list-api';
import { api } from '@/lib/api';
import { toFormData } from '@/lib/form-data';

export interface AdminAdministrator {
  id: number;
  name: string;
  email: string;
  image: string | null;
  emailVerified: boolean;
}

export interface CreateAdministratorInput {
  name: string;
  email: string;
  password: string;
}

export type UpdateAdministratorInput = Partial<Pick<AdminAdministrator, 'name' | 'email'>>;

const BASE = '/admin/administrators';

export const ADMINISTRATORS_QUERY_KEY = ['admin', 'administrators'] as const;

export const administratorsApi = {
  list: (params: AdminListParams) =>
    api.get<Paginated<AdminAdministrator>>(BASE, { query: params }),
  create: (input: CreateAdministratorInput, image: File) =>
    api.post<AdminAdministrator>(BASE, toFormData(input, { image })),
  update: (id: number, changes: UpdateAdministratorInput, image?: File | null) =>
    api.patch<AdminAdministrator>(`${BASE}/${id}`, toFormData(changes, { image })),
  remove: (id: number) => api.delete(`${BASE}/${id}`),
};

export const ADMINISTRATOR_ERROR_MESSAGES: Record<string, string> = {
  EMAIL_ALREADY_REGISTERED: 'Este e-mail já está cadastrado.',
  LAST_ADMINISTRATOR:
    'Não é possível excluir: o sistema precisa de pelo menos um administrador com e-mail confirmado.',
  CANNOT_DELETE_SELF: 'Você não pode excluir a própria conta.',
};
