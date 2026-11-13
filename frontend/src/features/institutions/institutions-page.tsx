import { useQuery } from '@tanstack/react-query';
import { SearchXIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { PageSizeSelect } from '@/components/page-size-select';
import { PaginationBar } from '@/components/pagination-bar';
import { SearchInput } from '@/components/search-input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { InstitutionCard } from '@/features/institutions/institution-card';
import { INSTITUTION_KINDS, type InstitutionKind } from '@/features/institutions/institution-kind';
import { listInstitutions } from '@/features/institutions/institutions-api';
import { DEFAULT_PAGE_SIZE, parsePageSize } from '@/lib/pagination';
import { UFS } from '@/lib/validation';

const ALL_STATES = 'all';
const FILTER_KEYS = ['search', 'city', 'state'] as const;

export function InstitutionsPage({ kind }: { kind: InstitutionKind }) {
  const copy = INSTITUTION_KINDS[kind];
  const [searchParams, setSearchParams] = useSearchParams();

  const pageParam = Number(searchParams.get('page'));
  const page = Number.isInteger(pageParam) && pageParam > 1 ? pageParam : 1;
  const pageSize = parsePageSize(searchParams.get('pageSize'));
  const search = searchParams.get('search') ?? '';
  const city = searchParams.get('city') ?? '';
  const state = searchParams.get('state') ?? '';

  const filters = {
    search: search || undefined,
    city: city || undefined,
    state: state || undefined,
    page,
    pageSize,
  };

  const query = useQuery({
    queryKey: ['institutions', kind, 'list', filters],
    queryFn: () => listInstitutions(kind, filters),
  });

  const hasActiveFilters = FILTER_KEYS.some((key) => searchParams.get(key));

  function setParam(key: string, value: string) {
    setSearchParams(
      (params) => {
        if (value) params.set(key, value);
        else params.delete(key);
        params.delete('page');
        return params;
      },
      { replace: true },
    );
  }

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

  const total = query.data?.total ?? 0;
  const totalPages = query.data ? Math.max(1, Math.ceil(total / query.data.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold">{copy.title}</h1>
        <p className="text-muted-foreground text-sm">{copy.subtitle}</p>
      </div>

      <div className="flex flex-col gap-3">
        <SearchInput
          value={search}
          onSearch={(next) => setParam('search', next)}
          placeholder="Buscar por nome, CNPJ ou descrição..."
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchInput
            value={city}
            onSearch={(next) => setParam('city', next)}
            placeholder="Cidade"
            className="sm:w-[220px]"
          />
          <Select
            value={state || ALL_STATES}
            onValueChange={(next) => setParam('state', next === ALL_STATES ? '' : next)}
          >
            <SelectTrigger className="w-full sm:w-[220px]" aria-label="Estado">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATES}>Todos os estados</SelectItem>
              {UFS.map((uf) => (
                <SelectItem key={uf} value={uf}>
                  {uf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {query.isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[90px] w-full" />
          ))}
        </div>
      )}

      {query.isError && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-foreground font-medium">
            Não foi possível carregar a lista. Tente novamente mais tarde.
          </p>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {query.data && query.data.data.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <SearchXIcon className="text-muted-foreground size-10" />
          <p className="text-foreground font-medium">{copy.emptyTitle}</p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          )}
        </div>
      )}

      {query.data && query.data.data.length > 0 && (
        <>
          <p className="text-muted-foreground text-sm">
            {total} {total === 1 ? copy.foundOne : copy.foundMany}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.data.map((institution) => (
              <InstitutionCard key={institution.id} kind={kind} institution={institution} />
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
