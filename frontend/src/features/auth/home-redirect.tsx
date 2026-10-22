import { Navigate } from 'react-router-dom';

import { homePathFor } from '@/features/auth/home-path';
import { FullPageSpinner } from '@/features/auth/protected-route';
import { useAuth } from '@/features/auth/use-auth';

export function HomeRedirect() {
  const { status, role } = useAuth();

  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;
  return <Navigate to={homePathFor(role)} replace />;
}
