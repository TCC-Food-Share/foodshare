import { useQuery } from '@tanstack/react-query';
import { Navigate, useSearchParams } from 'react-router-dom';

import { PaginationBar } from '@/components/pagination-bar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Role } from '@/features/auth/auth-context';
import { useAuth } from '@/features/auth/use-auth';
import { OrderCards } from '@/features/orders/order-cards';
import {
  isOrderStatus,
  listOrders,
  type Order,
  ORDER_STATUSES,
  type OrderStatusName,
} from '@/features/orders/orders-api';
import { OrdersEmptyState } from '@/features/orders/orders-empty-state';
import { OrdersTable } from '@/features/orders/orders-table';
import { useOrderCounts } from '@/features/orders/use-order-counts';
import { cn } from '@/lib/cn';

const ORDERS_PAGE_SIZE = 10;
const DEFAULT_STATUS: OrderStatusName = 'Pendente';

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

function ordersUrl(status: OrderStatusName, page: number): string {
  return page > 1 ? `/pedidos?status=${status}&page=${page}` : `/pedidos?status=${status}`;
}

export function OrdersPage() {
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const counts = useOrderCounts();

  const statusParam = searchParams.get('status');
  const status = isOrderStatus(statusParam) ? statusParam : DEFAULT_STATUS;
  const pageParam = Number(searchParams.get('page'));
  const page = Number.isInteger(pageParam) && pageParam > 1 ? pageParam : 1;

  const query = useQuery({
    queryKey: ['orders', 'list', { status, page }],
    queryFn: () => listOrders({ status, page, pageSize: ORDERS_PAGE_SIZE }),
  });

  const copy = PAGE_COPY[role ?? 'beneficiary'];

  function changeStatus(next: string) {
    if (isOrderStatus(next)) setSearchParams({ status: next });
  }

  function goToPage(nextPage: number) {
    setSearchParams(nextPage > 1 ? { status, page: String(nextPage) } : { status });
  }

  if (query.data && query.data.data.length === 0 && query.data.total > 0 && page > 1) {
    const lastPage = Math.ceil(query.data.total / ORDERS_PAGE_SIZE);
    return <Navigate replace to={ordersUrl(status, lastPage)} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold">{copy.title}</h1>
        <p className="text-muted-foreground text-sm">{copy.subtitle}</p>
      </div>

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
            <OrdersEmptyState status={status} role={role} />
          )}

          {query.data && query.data.data.length > 0 && (
            <OrdersList
              orders={query.data.data}
              total={query.data.total}
              page={page}
              role={role}
              onPageChange={goToPage}
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
  role: Role | null;
  onPageChange: (page: number) => void;
}

function OrdersList({ orders, total, page, role, onPageChange }: OrdersListProps) {
  const totalPages = Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE));
  const from = (page - 1) * ORDERS_PAGE_SIZE + 1;
  const to = from + orders.length - 1;
  const range = from === to ? `${from}` : `${from}–${to}`;

  return (
    <>
      <OrdersTable orders={orders} role={role} />
      <OrderCards orders={orders} role={role} />
      <div className="flex flex-col items-center gap-3 md:flex-row md:justify-between">
        <p className="text-muted-foreground text-sm">
          Mostrando {range} de {total} {total === 1 ? 'pedido' : 'pedidos'}
        </p>
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
