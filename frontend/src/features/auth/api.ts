import { api } from '@/lib/api';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  roleId: number;
  personalPhone: string | null;
}

// Raw role from the backend, distinct from the normalized `Role` in auth-context.ts.
export type BackendRole = 'Establishment' | 'BeneficiaryEntity' | 'Administrator';

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

// Recuperação de senha (RF08) e confirmação de e-mail (RF75): rotas nativas do
// plugin emailOTP do better-auth.

export function requestPasswordReset(email: string): Promise<unknown> {
  return api.post('/auth/email-otp/request-password-reset', { email });
}

export function checkResetCode(email: string, otp: string): Promise<unknown> {
  return api.post('/auth/email-otp/check-verification-otp', {
    email,
    otp,
    type: 'forget-password',
  });
}

export function resetPassword(email: string, otp: string, password: string): Promise<unknown> {
  return api.post('/auth/email-otp/reset-password', { email, otp, password });
}

export function verifyEmail(email: string, otp: string): Promise<unknown> {
  return api.post('/auth/email-otp/verify-email', { email, otp });
}

export function resendVerificationCode(email: string): Promise<unknown> {
  return api.post('/auth/send-verification-email', { email });
}
