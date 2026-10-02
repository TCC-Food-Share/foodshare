import type { Role } from '@/features/auth/auth-context';
import type { Order } from '@/features/orders/orders-api';

export function counterpartLabel(role: Role | null): string {
  return role === 'establishment' ? 'Entidade beneficiária' : 'Estabelecimento';
}

export function counterpartName(order: Order, role: Role | null): string {
  return role === 'establishment'
    ? order.beneficiaryEntity.companyName
    : order.establishment.companyName;
}
