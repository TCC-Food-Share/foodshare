import { createContext } from 'react';

import type { SessionUser } from '@/features/auth/api';

/** Papel normalizado para uso no frontend. */
export type Role = 'establishment' | 'beneficiary';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  status: AuthStatus;
  user: SessionUser | null;
  role: Role | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
