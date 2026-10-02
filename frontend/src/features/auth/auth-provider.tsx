import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import {
  type BackendRole,
  getMe,
  type SessionUser,
  signInEmail,
  signOutRequest,
} from '@/features/auth/api';
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
  type Role,
} from '@/features/auth/auth-context';
import { ApiError } from '@/lib/api';
import { setUnauthorizedHandler } from '@/lib/query-client';

const ROLE_MAP: Record<BackendRole, Role> = {
  Establishment: 'establishment',
  BeneficiaryEntity: 'beneficiary',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  const loadSession = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me.user);
      setRole(me.role ? ROLE_MAP[me.role] : null);
      setStatus('authenticated');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        setRole(null);
        setStatus('unauthenticated');
        return;
      }
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setUser(null);
    setRole(null);
    setStatus('unauthenticated');
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(reset);
    return () => setUnauthorizedHandler(null);
  }, [reset]);

  useEffect(() => {
    // loadSession's setState calls happen async, not in the effect body itself.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSession();
  }, [loadSession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await signInEmail(email, password);
      await loadSession();
    },
    [loadSession],
  );

  const signOut = useCallback(async () => {
    try {
      await signOutRequest();
    } finally {
      reset();
    }
  }, [reset]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, role, signIn, signOut }),
    [status, user, role, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
