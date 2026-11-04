import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, SearchIcon } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

import { PageSizeSelect } from '@/components/page-size-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AdminListParams, Paginated } from '@/features/admin/lists/list-api';
import { cn } from '@/lib/cn';
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination';

export interface AdminTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render: (row: T) => ReactNode;
}

interface AdminTableProps<T extends { id: number }> {
  columns: AdminTableColumn<T>[];
  result: Paginated<T> | undefined;
  isLoading: boolean;
  isError: boolean;
  params: AdminListParams;
  onParamsChange: (params: AdminListParams) => void;
  searchPlaceholder: string;
  itemLabel: string;
  rowActions?: (row: T) => ReactNode;
  toolbar?: ReactNode;
}

const SEARCH_DELAY_MS = 300;

function pageWindow(page: number, totalPages: number): number[] {
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, Math.max(page + 2, 5));
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);
  return pages;
}

function AdminPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const navClass = 'h-7 px-3 text-[13px] font-medium';
  return (
    <nav aria-label="Paginação" className="flex items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        className={navClass}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Anterior
      </Button>
      {pageWindow(page, totalPages).map((p) => (
        <Button
          key={p}
          type="button"
          variant={p === page ? 'default' : 'ghost'}
          aria-current={p === page ? 'page' : undefined}
          className="h-7 min-w-[30px] px-2.5 text-[13px] font-medium"
          onClick={() => onPageChange(p)}
        >
          {p}
        </Button>
      ))}
      <Button
        type="button"
        variant="outline"
        className={navClass}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Próximo
      </Button>
    </nav>
  );
}

export function AdminTable<T extends { id: number }>({
  columns,
  result,
  isLoading,
  isError,
  params,
  onParamsChange,
  searchPlaceholder,
  itemLabel,
  rowActions,
  toolbar,
}: AdminTableProps<T>) {
  const [search, setSearch] = useState(params.search ?? '');

  useEffect(() => {
    if (search === (params.search ?? '')) return;
    const timer = setTimeout(() => {
      onParamsChange({ ...params, search: search.trim() || undefined, page: 1 });
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search, params, onParamsChange]);

  function toggleSort(key: string) {
    const sameKey = (params.sort ?? 'id') === key;
    const order = sameKey && params.order !== 'desc' ? 'desc' : 'asc';
    onParamsChange({ ...params, sort: key, order, page: 1 });
  }

  const totalColumns = columns.length + (rowActions ? 1 : 0);
  const page = result?.page ?? 1;
  const pageSize = result?.pageSize ?? params.pageSize ?? DEFAULT_PAGE_SIZE;
  const total = result?.total ?? 0;
  const shown = result?.data.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
            aria-label={searchPlaceholder}
          />
        </div>
        {toolbar}
      </div>

      <div className="bg-card overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-accent">
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => {
                const active = (params.sort ?? 'id') === column.key;
                const SortIcon = !active
                  ? ArrowUpDownIcon
                  : params.order === 'desc'
                    ? ArrowDownIcon
                    : ArrowUpIcon;
                return (
                  <TableHead
                    key={column.key}
                    className={cn(
                      'text-muted-foreground h-[42px] px-4 text-xs font-semibold',
                      column.className,
                    )}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className="hover:text-foreground inline-flex items-center gap-1"
                      >
                        {column.header}
                        <SortIcon className={cn('size-3.5', !active && 'opacity-40')} />
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                );
              })}
              {rowActions && (
                <TableHead className="h-[42px] w-32 px-4">
                  <span className="sr-only">Ações</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }, (_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={totalColumns}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={totalColumns}
                  className="text-muted-foreground py-10 text-center"
                >
                  Não foi possível carregar a lista. Tente novamente em instantes.
                </TableCell>
              </TableRow>
            ) : result && result.data.length > 0 ? (
              result.data.map((row) => (
                <TableRow key={row.id} className="odd:bg-card even:bg-background h-14">
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn('px-4 text-[13px] font-medium', column.className)}
                    >
                      {column.render(row)}
                    </TableCell>
                  ))}
                  {rowActions && (
                    <TableCell className="px-4">
                      <div className="flex items-center justify-end gap-1">{rowActions(row)}</div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={totalColumns}
                  className="text-muted-foreground py-10 text-center"
                >
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="bg-card flex flex-col items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row">
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
            <span>
              Mostrando {shown} de {total} {itemLabel}
            </span>
            <PageSizeSelect
              value={pageSize}
              onChange={(next) => onParamsChange({ ...params, pageSize: next, page: 1 })}
            />
          </div>
          <AdminPagination
            page={page}
            totalPages={totalPages}
            onPageChange={(next) => onParamsChange({ ...params, page: next })}
          />
        </div>
      </div>
    </div>
  );
}
