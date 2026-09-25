import { useQuery } from '@tanstack/react-query';
import { ArrowLeftIcon } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/use-auth';
import {
  CounterpartCard,
  OrderFoodCard,
  OrderSummaryCard,
} from '@/features/orders/order-detail-cards';
import { OrderStatusBadge } from '@/features/orders/order-status-badge';
import { getOrder } from '@/features/orders/orders-api';
import { ApiError } from '@/lib/api';
import { formatLocalDateTime } from '@/lib/format';

function NotFoundState() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-foreground font-medium">Pedido não encontrado.</p>
      <Button variant="outline" size="sm" asChild>
        <Link to="/pedidos">Voltar para pedidos</Link>
      </Button>
    </div>
  );
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const orderId = Number(id);
  const validId = Number.isInteger(orderId) && orderId > 0;

  const query = useQuery({
    queryKey: ['orders', 'detail', orderId],
    queryFn: () => getOrder(orderId),
    enabled: validId,
  });

  if (!validId) return <NotFoundState />;

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-20 w-1/2" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
          <Skeleton className="h-72 w-full" />
          <div className="flex flex-col gap-6">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) return <NotFoundState />;

    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-foreground font-medium">
          Não foi possível carregar o pedido. Tente novamente mais tarde.
        </p>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const order = query.data!;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          to={`/pedidos?status=${order.status.name}`}
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeftIcon className="size-4" />
          Pedidos
        </Link>
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-foreground text-2xl font-bold">Pedido #{order.id}</h1>
            <OrderStatusBadge status={order.status.name} />
          </div>
          <p className="text-muted-foreground text-sm">
            Solicitado em {formatLocalDateTime(order.orderDate)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_360px]">
        <OrderFoodCard key={order.id} food={order.food} />
        <div className="flex flex-col gap-6">
          <OrderSummaryCard order={order} />
          <CounterpartCard order={order} role={role} />
        </div>
      </div>
    </div>
  );
}
