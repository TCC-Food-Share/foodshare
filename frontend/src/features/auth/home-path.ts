import type { Role } from '@/features/auth/auth-context';

export const ADMIN_HOME = '/admin';
export const INSTITUTION_HOME = '/feed';

export const INSTITUTION_ROLES: Role[] = ['establishment', 'beneficiary'];

export function homePathFor(role: Role | null): string {
  return role === 'administrator' ? ADMIN_HOME : INSTITUTION_HOME;
}

function isAdminPath(pathname: string): boolean {
  return pathname === ADMIN_HOME || pathname.startsWith(`${ADMIN_HOME}/`);
}

export function isPathOfRoleArea(role: Role | null, pathname: string): boolean {
  return role === 'administrator' ? isAdminPath(pathname) : !isAdminPath(pathname);
}
