import { useQuery } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { PageSizeSelect } from '@/components/page-size-select';
import { PaginationBar } from '@/components/pagination-bar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/use-auth';
import { CreateFoodDialog } from '@/features/foods/create-food-dialog';
import { EmptyState } from '@/features/foods/empty-state';
import { FoodCard } from '@/features/foods/food-card';
import { listFoods } from '@/features/foods/foods-api';
import { SearchFilters } from '@/features/foods/search-filters';
import { DEFAULT_PAGE_SIZE, parsePageSize } from '@/lib/pagination';

const FILTER_KEYS = ['name', 'categoryId', 'city', 'state'] as const;

export function FeedPage() {
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);

  const page = Number(searchParams.get('page') ?? '1') || 1;
  const pageSize = parsePageSize(searchParams.get('pageSize'));
  const filters = {
    name: searchParams.get('name') ?? undefined,
    categoryId: searchParams.get('categoryId') ? Number(searchParams.get('categoryId')) : undefined,
    city: searchParams.get('city') ?? undefined,
    state: searchParams.get('state') ?? undefined,
    page,
    pageSize,
  };

  const query = useQuery({
    queryKey: ['foods', filters],
    queryFn: () => listFoods(filters),
  });

  const hasActiveFilters = FILTER_KEYS.some((key) => searchParams.get(key));

  function clearFilters() {
    setSearchParams(pageSize === DEFAULT_PAGE_SIZE ? {} : { pageSize: String(pageSize) });
  }

  function changePageSize(next: number) {
    setSearchParams((params) => {
      params.delete('page');
      if (next === DEFAULT_PAGE_SIZE) params.delete('pageSize');
      else params.set('pageSize', String(next));
      return params;
    });
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-2xl font-bold">Feed de Alimentos</h1>
          <p className="text-muted-foreground text-sm">
            Encontre alimentos disponíveis para doação
          </p>
        </div>
        {role === 'establishment' && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <PlusIcon />
            Cadastrar alimento
          </Button>
        )}
      </div>

      <SearchFilters searchParams={searchParams} setSearchParams={setSearchParams} />

      {role === 'establishment' && (
        <CreateFoodDialog open={createOpen} onOpenChange={setCreateOpen} />
      )}

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

          <div className="flex flex-col items-center gap-3 md:flex-row md:justify-between">
            <PageSizeSelect value={pageSize} onChange={changePageSize} />
            <PaginationBar
              page={page}
              totalPages={totalPages}
              onPageChange={goToPage}
              className="mx-0 w-auto"
            />
          </div>
        </>
      )}
    </div>
  );
}
