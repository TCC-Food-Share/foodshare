import type { Role } from '@/features/auth/auth-context';
import { ORDER_STATUS } from '@/features/orders/order-status';
import type { OrderDetail, OrderInstitution } from '@/features/orders/orders-api';

export function counterpartOf(order: OrderDetail, role: Role | null): OrderInstitution {
  return role === 'establishment' ? order.beneficiaryEntity : order.establishment;
}

/** Contato da outra parte (RF28, RN12): só existe com o pedido "Em andamento". */
export function hasCounterpartContact(order: OrderDetail, role: Role | null): boolean {
  if (order.status.name !== ORDER_STATUS.IN_PROGRESS) return false;
  const { institutionalEmail, institutionalPhone, address } = counterpartOf(order, role);
  return Boolean(institutionalEmail && institutionalPhone && address);
}
