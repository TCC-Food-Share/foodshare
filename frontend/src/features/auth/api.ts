import { api } from '@/lib/api';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  roleId: number;
  personalPhone: string;
}

// Raw role from the backend, distinct from the normalized `Role` in auth-context.ts.
export type BackendRole = 'Establishment' | 'BeneficiaryEntity';

export interface MeResponse {
  user: SessionUser;
  role: BackendRole | null;
}

export function getMe(): Promise<MeResponse> {
  return api.get<MeResponse>('/me');
}

export function signInEmail(email: string, password: string): Promise<unknown> {
  return api.post('/auth/sign-in/email', { email, password });
}

export function signOutRequest(): Promise<unknown> {
  return api.post('/auth/sign-out');
}
