import { useQueries } from '@tanstack/react-query';

import { FOOD_STATUSES, type FoodStatusName } from '@/features/foods/food-status';
import { listMyFoods, MY_FOODS_REFETCH_INTERVAL } from '@/features/foods/my-foods-api';
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination';

export function useMyFoodCounts(): Record<FoodStatusName, number | undefined> {
  const results = useQueries({
    queries: FOOD_STATUSES.map((status) => ({
      queryKey: ['foods', 'mine', 'count', status],
      queryFn: () => listMyFoods({ status, page: 1, pageSize: DEFAULT_PAGE_SIZE }),
      refetchInterval: MY_FOODS_REFETCH_INTERVAL,
    })),
  });

  const counts = {} as Record<FoodStatusName, number | undefined>;
  FOOD_STATUSES.forEach((status, index) => {
    counts[status] = results[index].data?.total;
  });
  return counts;
}
