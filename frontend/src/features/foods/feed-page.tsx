import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/features/foods/empty-state';
import { FoodCard } from '@/features/foods/food-card';
import { listFoods } from '@/features/foods/foods-api';
import { SearchFilters } from '@/features/foods/search-filters';

const FILTER_KEYS = ['name', 'categoryId', 'city', 'state'] as const;

function pageWindow(page: number, totalPages: number): number[] {
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, Math.max(page + 2, 5));
  const pages: number[] = [];
  for (let p = Math.max(1, start); p <= end; p++) pages.push(p);
  return pages;
}

export function FeedPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get('page') ?? '1') || 1;
  const filters = {
    name: searchParams.get('name') ?? undefined,
    categoryId: searchParams.get('categoryId') ? Number(searchParams.get('categoryId')) : undefined,
    city: searchParams.get('city') ?? undefined,
    state: searchParams.get('state') ?? undefined,
    page,
  };

  const query = useQuery({
    queryKey: ['foods', filters],
    queryFn: () => listFoods(filters),
  });

  const hasActiveFilters = FILTER_KEYS.some((key) => searchParams.get(key));

  function clearFilters() {
    setSearchParams({});
  }

  function goToPage(nextPage: number) {
    setSearchParams((params) => {
      if (nextPage <= 1) params.delete('page');
      else params.set('page', String(nextPage));
      return params;
    });
  }

  const totalPages = query.data
    ? Math.max(1, Math.ceil(query.data.total / query.data.pageSize))
    : 1;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold">Feed de Alimentos</h1>
        <p className="text-muted-foreground text-sm">Encontre alimentos disponíveis para doação</p>
      </div>

      <SearchFilters searchParams={searchParams} setSearchParams={setSearchParams} />

      {query.isLoading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      )}

      {query.isError && (
        <p className="text-muted-foreground py-16 text-center text-sm">
          Não foi possível carregar o feed. Tente novamente mais tarde.
        </p>
      )}

      {query.data && query.data.data.length === 0 && (
        <EmptyState hasActiveFilters={hasActiveFilters} onClearFilters={clearFilters} />
      )}

      {query.data && query.data.data.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.data.map((food) => (
              <FoodCard key={food.id} food={food} />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                {page > 1 && (
                  <PaginationItem>
                    <PaginationPrevious onClick={() => goToPage(page - 1)} />
                  </PaginationItem>
                )}
                {pageWindow(page, totalPages).map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink isActive={p === page} onClick={() => goToPage(p)}>
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                {page < totalPages && (
                  <PaginationItem>
                    <PaginationNext onClick={() => goToPage(page + 1)} />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}
