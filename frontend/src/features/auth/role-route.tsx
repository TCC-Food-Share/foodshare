import { Navigate, Outlet } from 'react-router-dom';

import type { Role } from '@/features/auth/auth-context';
import { FullPageSpinner } from '@/features/auth/protected-route';
import { useAuth } from '@/features/auth/use-auth';

export function RoleRoute({ role }: { role: Role }) {
  const { status, role: currentRole } = useAuth();

  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;
  if (currentRole !== role) return <Navigate to="/feed" replace />;
  return <Outlet />;
}
