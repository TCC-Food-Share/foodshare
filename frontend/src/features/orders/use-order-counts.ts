import { useQueries } from '@tanstack/react-query';

import { listOrders, ORDER_STATUSES, type OrderStatusName } from '@/features/orders/orders-api';

export function useOrderCounts(): Record<OrderStatusName, number | undefined> {
  const results = useQueries({
    queries: ORDER_STATUSES.map((status) => ({
      queryKey: ['orders', 'count', status],
      queryFn: () => listOrders({ status, page: 1, pageSize: 1 }),
    })),
  });

  const counts = {} as Record<OrderStatusName, number | undefined>;
  ORDER_STATUSES.forEach((status, index) => {
    counts[status] = results[index].data?.total;
  });
  return counts;
}
