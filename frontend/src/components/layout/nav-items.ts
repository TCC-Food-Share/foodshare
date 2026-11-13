import type { Role } from '@/features/auth/auth-context';
import { INSTITUTION_KINDS, oppositeKindOf } from '@/features/institutions/institution-kind';

export interface NavItem {
  label: string;
  to: string;
}

export function navItemsFor(role: Role | null): NavItem[] {
  const items: NavItem[] = [{ label: 'Feed', to: '/feed' }];

  if (role === 'establishment') {
    items.push({ label: 'Meus alimentos', to: '/meus-alimentos' });
    items.push({ label: 'Pedidos recebidos', to: '/pedidos' });
  } else if (role === 'beneficiary') {
    items.push({ label: 'Meus pedidos', to: '/pedidos' });
  }

  const kind = oppositeKindOf(role);
  if (kind) {
    items.push({ label: INSTITUTION_KINDS[kind].title, to: INSTITUTION_KINDS[kind].basePath });
  }

  items.push({ label: 'Perfil', to: '/perfil' });
  return items;
}
