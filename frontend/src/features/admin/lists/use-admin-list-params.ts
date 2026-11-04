import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { AdminListParams } from '@/features/admin/lists/list-api';
import { DEFAULT_PAGE_SIZE, parsePageSize } from '@/lib/pagination';

export function useAdminListParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = useMemo<AdminListParams>(() => {
    const page = Number(searchParams.get('page'));
    const order = searchParams.get('order');
    return {
      search: searchParams.get('search') ?? undefined,
      sort: searchParams.get('sort') ?? undefined,
      order: order === 'desc' ? 'desc' : order === 'asc' ? 'asc' : undefined,
      page: Number.isInteger(page) && page > 1 ? page : 1,
      pageSize: parsePageSize(searchParams.get('pageSize')),
    };
  }, [searchParams]);

  const setParams = useCallback(
    (next: AdminListParams) => {
      const entries = Object.entries(next).filter(
        ([key, value]) =>
          value !== undefined &&
          value !== '' &&
          !(key === 'page' && value === 1) &&
          !(key === 'pageSize' && value === DEFAULT_PAGE_SIZE),
      );
      setSearchParams(Object.fromEntries(entries.map(([key, value]) => [key, String(value)])), {
        replace: true,
      });
    },
    [setSearchParams],
  );

  return [params, setParams] as const;
}
