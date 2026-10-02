import { useQueries } from '@tanstack/react-query';

import { OPEN_ORDER_STATUSES } from '@/features/orders/order-status';
import { listOrdersByStatus } from '@/features/orders/orders-api';

// Mirrors MAX_OPEN_ORDERS in backend/src/orders/orders.service.ts — keep in sync.
export const ORDERS_IN_PROGRESS_LIMIT = 10;

export function useOrdersInProgress(enabled: boolean) {
  const results = useQueries({
    queries: OPEN_ORDER_STATUSES.map((status) => ({
      queryKey: ['orders', 'in-progress', status],
      queryFn: () => listOrdersByStatus(status),
      enabled,
    })),
  });

  const pages = results.map((result) => result.data);
  const count = pages.every((page) => page !== undefined)
    ? pages.reduce((sum, page) => sum + page.total, 0)
    : undefined;

  return {
    count,
    limitReached: count !== undefined && count >= ORDERS_IN_PROGRESS_LIMIT,
    hasInProgressOrderFor: (foodId: number) =>
      pages.some((page) => page?.data.some((order) => order.food.id === foodId)),
  };
}
