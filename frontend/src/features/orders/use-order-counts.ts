import { useQueries } from '@tanstack/react-query';

import { ORDER_STATUSES, type OrderStatusName } from '@/features/orders/order-status';
import { listOrders, ORDERS_REFETCH_INTERVAL } from '@/features/orders/orders-api';
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination';

export function useOrderCounts(search = ''): Record<OrderStatusName, number | undefined> {
  const results = useQueries({
    queries: ORDER_STATUSES.map((status) => ({
      queryKey: ['orders', 'count', status, search],
      queryFn: () => listOrders({ status, page: 1, pageSize: DEFAULT_PAGE_SIZE, search }),
      refetchInterval: ORDERS_REFETCH_INTERVAL,
    })),
  });

  const counts = {} as Record<OrderStatusName, number | undefined>;
  ORDER_STATUSES.forEach((status, index) => {
    counts[status] = results[index].data?.total;
  });
  return counts;
}
