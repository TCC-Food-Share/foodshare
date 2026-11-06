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
import { SessionErrorScreen } from '@/features/auth/session-error-screen';
import { ApiError, isTooManyRequests } from '@/lib/api';
import { setUnauthorizedHandler } from '@/lib/query-client';

const ROLE_MAP: Record<BackendRole, Role> = {
  Establishment: 'establishment',
  BeneficiaryEntity: 'beneficiary',
  Administrator: 'administrator',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [tooManyRequests, setTooManyRequests] = useState(false);

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

  const startSession = useCallback(async () => {
    try {
      await loadSession();
    } catch (error) {
      setTooManyRequests(isTooManyRequests(error));
      setStatus('error');
    }
  }, [loadSession]);

  const retrySession = useCallback(() => {
    setStatus('loading');
    void startSession();
  }, [startSession]);

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
    void startSession();
  }, [startSession]);

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
    () => ({ status, user, role, signIn, signOut, refreshSession: loadSession, retrySession }),
    [status, user, role, signIn, signOut, loadSession, retrySession],
  );

  return (
    <AuthContext.Provider value={value}>
      {status === 'error' ? (
        <SessionErrorScreen tooManyRequests={tooManyRequests} onRetry={retrySession} />
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
