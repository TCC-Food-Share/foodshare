import { useQuery } from '@tanstack/react-query';
import { Navigate, useSearchParams } from 'react-router-dom';

import { PageSizeSelect } from '@/components/page-size-select';
import { PaginationBar } from '@/components/pagination-bar';
import { SearchInput } from '@/components/search-input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Role } from '@/features/auth/auth-context';
import { useAuth } from '@/features/auth/use-auth';
import { OrderCards } from '@/features/orders/order-cards';
import {
  isOrderStatus,
  ORDER_STATUS,
  ORDER_STATUSES,
  type OrderStatusName,
} from '@/features/orders/order-status';
import { listOrders, type Order, ORDERS_REFETCH_INTERVAL } from '@/features/orders/orders-api';
import { OrdersEmptyState } from '@/features/orders/orders-empty-state';
import { OrdersTable } from '@/features/orders/orders-table';
import { useOrderCounts } from '@/features/orders/use-order-counts';
import { cn } from '@/lib/cn';
import { DEFAULT_PAGE_SIZE, parsePageSize } from '@/lib/pagination';

const SEARCH_MAX_LENGTH = 100;

const DEFAULT_STATUS: OrderStatusName = ORDER_STATUS.PENDING;

const PAGE_COPY = {
  establishment: {
    title: 'Pedidos recebidos',
    subtitle: 'Acompanhe as solicitações de doação feitas aos seus alimentos',
  },
  beneficiary: {
    title: 'Meus pedidos',
    subtitle: 'Acompanhe suas solicitações de doação de alimentos',
  },
};

function ordersParams(status: OrderStatusName, page: number, pageSize: number, search: string) {
  return {
    status,
    ...(search && { search }),
    ...(page > 1 && { page: String(page) }),
    ...(pageSize !== DEFAULT_PAGE_SIZE && { pageSize: String(pageSize) }),
  };
}

export function OrdersPage() {
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusParam = searchParams.get('status');
  const status = isOrderStatus(statusParam) ? statusParam : DEFAULT_STATUS;
  const pageParam = Number(searchParams.get('page'));
  const page = Number.isInteger(pageParam) && pageParam > 1 ? pageParam : 1;
  const pageSize = parsePageSize(searchParams.get('pageSize'));
  const search = (searchParams.get('search') ?? '').slice(0, SEARCH_MAX_LENGTH).trim();
  const counts = useOrderCounts(search);

  const query = useQuery({
    queryKey: ['orders', 'list', { status, page, pageSize, search }],
    queryFn: () => listOrders({ status, page, pageSize, search }),
    refetchInterval: ORDERS_REFETCH_INTERVAL,
  });

  const copy = PAGE_COPY[role === 'establishment' ? 'establishment' : 'beneficiary'];

  function changeStatus(next: string) {
    if (isOrderStatus(next)) setSearchParams(ordersParams(next, 1, pageSize, search));
  }

  function goToPage(nextPage: number) {
    setSearchParams(ordersParams(status, nextPage, pageSize, search));
  }

  if (query.data && query.data.data.length === 0 && query.data.total > 0 && page > 1) {
    const lastPage = Math.ceil(query.data.total / pageSize);
    const params = new URLSearchParams(ordersParams(status, lastPage, pageSize, search));
    return <Navigate replace to={`/pedidos?${params.toString()}`} />;
  }

  function changeSearch(next: string) {
    setSearchParams(ordersParams(status, 1, pageSize, next));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold">{copy.title}</h1>
        <p className="text-muted-foreground text-sm">{copy.subtitle}</p>
      </div>

      <SearchInput
        value={search}
        onSearch={changeSearch}
        placeholder={
          role === 'establishment'
            ? 'Buscar por alimento ou data do pedido...'
            : 'Buscar por alimento, estabelecimento ou data do pedido...'
        }
        className="sm:max-w-md"
      />

      <Tabs value={status} onValueChange={changeStatus} className="gap-4">
        <TabsList variant="line" aria-label="Pedidos por status">
          {ORDER_STATUSES.map((tabStatus) => (
            <TabsTrigger key={tabStatus} value={tabStatus}>
              {tabStatus}
              {counts[tabStatus] !== undefined && (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-xs tabular-nums',
                    tabStatus === status
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {counts[tabStatus]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={status} className="flex flex-col gap-4">
          {query.isLoading && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}

          {query.isError && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-foreground font-medium">
                Não foi possível carregar os pedidos. Tente novamente mais tarde.
              </p>
              <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                Tentar novamente
              </Button>
            </div>
          )}

          {query.data && query.data.data.length === 0 && (
            <OrdersEmptyState
              status={status}
              role={role}
              search={search}
              onClearSearch={() => changeSearch('')}
            />
          )}

          {query.data && query.data.data.length > 0 && (
            <OrdersList
              orders={query.data.data}
              total={query.data.total}
              page={page}
              pageSize={pageSize}
              role={role}
              status={status}
              onPageChange={goToPage}
              onPageSizeChange={(next) => setSearchParams(ordersParams(status, 1, next, search))}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface OrdersListProps {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
  role: Role | null;
  status: OrderStatusName;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

function OrdersList({
  orders,
  total,
  page,
  pageSize,
  role,
  status,
  onPageChange,
  onPageSizeChange,
}: OrdersListProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = from + orders.length - 1;
  const range = from === to ? `${from}` : `${from}–${to}`;

  return (
    <>
      <OrdersTable orders={orders} role={role} status={status} />
      <OrderCards orders={orders} role={role} status={status} />
      <div className="flex flex-col items-center gap-3 md:flex-row md:justify-between">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <p className="text-muted-foreground text-sm">
            Mostrando {range} de {total} {total === 1 ? 'pedido' : 'pedidos'}
          </p>
          <PageSizeSelect value={pageSize} onChange={onPageSizeChange} />
        </div>
        <PaginationBar
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
          className="mx-0 w-auto"
        />
      </div>
    </>
  );
}
