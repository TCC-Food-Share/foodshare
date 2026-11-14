import { createContext } from 'react';

import type { SessionUser } from '@/features/auth/api';

// Normalized role, distinct from the raw `BackendRole` values in api.ts.
export type Role = 'establishment' | 'beneficiary' | 'administrator';

export type InstitutionRole = Exclude<Role, 'administrator'>;

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  user: SessionUser | null;
  role: Role | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  // Clears the local session only, for when the server already ended it (account deletion).
  endSession: () => void;
  refreshSession: () => Promise<void>;
  retrySession: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
