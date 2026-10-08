import { Navigate, Outlet } from 'react-router-dom';

import type { Role } from '@/features/auth/auth-context';
import { homePathFor } from '@/features/auth/home-path';
import { FullPageSpinner } from '@/features/auth/protected-route';
import { useAuth } from '@/features/auth/use-auth';

export function RoleRoute({ roles }: { roles: Role[] }) {
  const { status, role: currentRole } = useAuth();

  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;
  if (!currentRole || !roles.includes(currentRole)) {
    return <Navigate to={homePathFor(currentRole)} replace />;
  }
  return <Outlet />;
}
