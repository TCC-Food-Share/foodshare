import type { AdminFoodOrderCounts, AdminFoodRow } from '@/features/admin/foods/admin-foods-api';
import { formatQuantity } from '@/lib/format';

export const ORDER_COUNT_LABELS: Record<keyof AdminFoodOrderCounts, string> = {
  pending: 'pendente(s)',
  inProgress: 'em andamento',
  rejected: 'rejeitado(s)',
  donated: 'doado(s)',
  cancelled: 'cancelado(s)',
};

/** "1 pendente(s), 2 doado(s)", only the statuses that have orders. */
export function orderCountsSummary(orders: AdminFoodOrderCounts): string | null {
  const parts = (Object.keys(ORDER_COUNT_LABELS) as (keyof AdminFoodOrderCounts)[])
    .filter((key) => orders[key] > 0)
    .map((key) => `${orders[key]} ${ORDER_COUNT_LABELS[key]}`);
  return parts.length > 0 ? parts.join(', ') : null;
}

export const formatFoodQuantity = (food: Pick<AdminFoodRow, 'quantity' | 'measurementUnit'>) =>
  `${formatQuantity(food.quantity)} ${food.measurementUnit.abbreviation}`;
