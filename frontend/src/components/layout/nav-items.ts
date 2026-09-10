import type { Role } from '@/features/auth/auth-context';

export interface NavItem {
  label: string;
  to: string;
}

/**
 * Navegação recortada ao escopo do MVP (RF01–RF20). Sem "Estabelecimentos"/
 * "Instituições" (perfil público — fora do escopo) e sem área administrativa.
 */
export function navItemsFor(role: Role | null): NavItem[] {
  const items: NavItem[] = [{ label: 'Feed', to: '/feed' }];

  if (role === 'establishment') {
    items.push({ label: 'Pedidos recebidos', to: '/pedidos' });
  } else if (role === 'beneficiary') {
    items.push({ label: 'Meus pedidos', to: '/pedidos' });
  }

  items.push({ label: 'Meu perfil', to: '/perfil' });
  return items;
}
