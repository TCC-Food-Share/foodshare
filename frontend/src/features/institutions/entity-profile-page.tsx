import { useQuery } from '@tanstack/react-query';
import { InboxIcon } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';

import { PageSizeSelect } from '@/components/page-size-select';
import { PaginationBar } from '@/components/pagination-bar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/features/auth/use-auth';
import { parseProfileId } from '@/features/institutions/institution-kind';
import {
  getInstitution,
  institutionKey,
  isNotFound,
} from '@/features/institutions/institutions-api';
import {
  BackToList,
  ProfileError,
  ProfileHeader,
  ProfileSection,
  ProfileSkeleton,
} from '@/features/institutions/profile-parts';
import { OrderCards } from '@/features/orders/order-cards';
import {
  isOrderStatus,
  ORDER_STATUSES,
  type OrderStatusName,
} from '@/features/orders/order-status';
import { listOrders, ORDERS_REFETCH_INTERVAL } from '@/features/orders/orders-api';
import { OrdersTable } from '@/features/orders/orders-table';
import { useOrderCounts } from '@/features/orders/use-order-counts';
import { cn } from '@/lib/cn';
import { DEFAULT_PAGE_SIZE, parsePageSize } from '@/lib/pagination';

const ALL_TAB = 'Todos';

function historyParams(status: OrderStatusName | null, page: number, pageSize: number) {
  return {
    ...(status && { status }),
    ...(page > 1 && { page: String(page) }),
    ...(pageSize !== DEFAULT_PAGE_SIZE && { pageSize: String(pageSize) }),
  };
}

export function EntityProfilePage() {
  const { role } = useAuth();
  const id = parseProfileId(useParams().id);
  const [searchParams, setSearchParams] = useSearchParams();

  const statusParam = searchParams.get('status');
  const status = isOrderStatus(statusParam) ? statusParam : null;
  const pageParam = Number(searchParams.get('page'));
  const page = Number.isInteger(pageParam) && pageParam > 1 ? pageParam : 1;
  const pageSize = parsePageSize(searchParams.get('pageSize'));

  const profileQuery = useQuery({
    queryKey: institutionKey('beneficiary-entity', id ?? 0),
    queryFn: () => getInstitution('beneficiary-entity', id!),
    enabled: id !== null,
  });

  const counts = useOrderCounts('', id ?? undefined, profileQuery.isSuccess);
  const allCount = ORDER_STATUSES.every((tab) => counts[tab] !== undefined)
    ? ORDER_STATUSES.reduce((sum, tab) => sum + (counts[tab] ?? 0), 0)
    : undefined;

  const ordersQuery = useQuery({
    queryKey: ['orders', 'list', { status, page, pageSize, beneficiaryEntityId: id }],
    queryFn: () =>
      listOrders({ status: status ?? undefined, page, pageSize, beneficiaryEntityId: id! }),
    enabled: profileQuery.isSuccess,
    refetchInterval: ORDERS_REFETCH_INTERVAL,
  });

  if (id === null || profileQuery.isError) {
    return (
      <ProfileError
        kind="beneficiary-entity"
        notFound={id === null || isNotFound(profileQuery.error)}
        onRetry={() => void profileQuery.refetch()}
      />
    );
  }

  if (!profileQuery.data) return <ProfileSkeleton />;

  const tabs: { value: string; label: string; count: number | undefined }[] = [
    { value: ALL_TAB, label: ALL_TAB, count: allCount },
    ...ORDER_STATUSES.map((tab) => ({ value: tab, label: tab, count: counts[tab] })),
  ];
  const activeTab = status ?? ALL_TAB;
  const total = ordersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-6">
      <BackToList kind="beneficiary-entity" />
      <ProfileHeader institution={profileQuery.data} />

      <ProfileSection title="Histórico de pedidos" subtitle="Pedidos entre você e esta entidade">
        <Tabs
          value={activeTab}
          onValueChange={(next) =>
            setSearchParams(historyParams(isOrderStatus(next) ? next : null, 1, pageSize))
          }
          className="gap-4"
        >
          <TabsList variant="line" aria-label="Pedidos por status">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-xs tabular-nums',
                      tab.value === activeTab
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="flex flex-col gap-4">
            {ordersQuery.isLoading && (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            )}

            {ordersQuery.isError && (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <p className="text-foreground font-medium">
                  Não foi possível carregar os pedidos. Tente novamente mais tarde.
                </p>
                <Button variant="outline" size="sm" onClick={() => void ordersQuery.refetch()}>
                  Tentar novamente
                </Button>
              </div>
            )}

            {ordersQuery.data && ordersQuery.data.data.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <InboxIcon className="text-muted-foreground size-10" />
                <p className="text-foreground font-medium">
                  {status
                    ? `Nenhum pedido com status "${status}" entre vocês`
                    : 'Nenhum pedido entre vocês ainda'}
                </p>
              </div>
            )}

            {ordersQuery.data && ordersQuery.data.data.length > 0 && (
              <>
                <OrdersTable
                  orders={ordersQuery.data.data}
                  role={role}
                  status={status}
                  showCounterpart={false}
                />
                <OrderCards
                  orders={ordersQuery.data.data}
                  role={role}
                  status={status}
                  showCounterpart={false}
                />
                <div className="flex flex-col items-center gap-3 md:flex-row md:justify-between">
                  <PageSizeSelect
                    value={pageSize}
                    onChange={(next) => setSearchParams(historyParams(status, 1, next))}
                  />
                  <PaginationBar
                    page={page}
                    totalPages={totalPages}
                    onPageChange={(next) => setSearchParams(historyParams(status, next, pageSize))}
                    className="mx-0 w-auto"
                  />
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </ProfileSection>
    </div>
  );
}
