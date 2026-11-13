import { ChevronRightIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { Role } from '@/features/auth/auth-context';
import { counterpartLabel, counterpartName } from '@/features/orders/order-counterpart';
import {
  cancelledByLabel,
  ORDER_STATUS,
  type OrderStatusName,
} from '@/features/orders/order-status';
import { OrderStatusBadge } from '@/features/orders/order-status-badge';
import type { Order } from '@/features/orders/orders-api';
import { formatLocalDate, formatQuantity } from '@/lib/format';

interface OrderCardsProps {
  orders: Order[];
  role: Role | null;
  /** `null` lists every status together. */
  status: OrderStatusName | null;
  showCounterpart?: boolean;
}

export function OrderCards({ orders, role, status, showCounterpart = true }: OrderCardsProps) {
  const cancelledTab = status === ORDER_STATUS.CANCELLED;
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            to={`/pedidos/${order.id}`}
            className="border-border bg-card hover:bg-muted/50 focus-visible:ring-ring/50 flex flex-col gap-3 rounded-lg border p-4 transition-colors outline-none focus-visible:ring-[3px]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-foreground truncate font-medium">{order.food.name}</span>
                <span className="text-muted-foreground text-xs">
                  Pedido #{order.id} · {formatLocalDate(order.orderDate)}
                </span>
              </div>
              <OrderStatusBadge status={order.status.name} />
            </div>
            <div className="flex items-end justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-0.5 text-sm">
                <span className="text-foreground tabular-nums">
                  {formatQuantity(order.quantity)} {order.food.quantityUnit}
                </span>
                {showCounterpart && (
                  <span className="text-muted-foreground truncate text-xs">
                    {counterpartLabel(role)}: {counterpartName(order, role)}
                  </span>
                )}
                {cancelledTab && (
                  <>
                    <span className="text-muted-foreground text-xs">
                      Motivo:{' '}
                      <span className="text-foreground">
                        {order.cancellationReason?.name ?? '—'}
                      </span>
                    </span>
                    <span className="text-muted-foreground text-xs">
                      Cancelado por: {cancelledByLabel(order.cancelledBy, role)}
                    </span>
                  </>
                )}
              </div>
              <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
