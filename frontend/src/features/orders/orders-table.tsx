import { EyeIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

interface OrdersTableProps {
  orders: Order[];
  role: Role | null;
  status: OrderStatusName;
}

export function OrdersTable({ orders, role, status }: OrdersTableProps) {
  const navigate = useNavigate();
  // The "Cancelado" tab swaps the status column (always the same there) for the reason and who
  // cancelled (RF26, DT33).
  const cancelledTab = status === ORDER_STATUS.CANCELLED;

  return (
    <div className="border-border bg-card hidden overflow-hidden rounded-lg border md:block">
      <Table>
        <TableCaption className="sr-only">Lista de pedidos</TableCaption>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-4">Alimento</TableHead>
            <TableHead className="px-4 text-right">Quantidade</TableHead>
            <TableHead className="px-4">Data</TableHead>
            {cancelledTab ? (
              <>
                <TableHead className="px-4">Motivo</TableHead>
                <TableHead className="px-4">Cancelado por</TableHead>
              </>
            ) : (
              <TableHead className="px-4">Status</TableHead>
            )}
            <TableHead className="px-4">{counterpartLabel(role)}</TableHead>
            <TableHead className="px-4 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow
              key={order.id}
              className="cursor-pointer"
              onClick={() => navigate(`/pedidos/${order.id}`)}
            >
              <TableCell className="min-w-40 px-4 py-3 whitespace-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="text-foreground font-medium">{order.food.name}</span>
                  <span className="text-muted-foreground text-xs">Pedido #{order.id}</span>
                </div>
              </TableCell>
              <TableCell className="px-4 py-3 text-right tabular-nums">
                {formatQuantity(order.quantity)} {order.food.quantityUnit}
              </TableCell>
              <TableCell className="text-muted-foreground px-4 py-3">
                {formatLocalDate(order.orderDate)}
              </TableCell>
              {cancelledTab ? (
                <>
                  <TableCell className="min-w-40 px-4 py-3 whitespace-normal">
                    {order.cancellationReason?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground px-4 py-3">
                    {cancelledByLabel(order.cancelledBy, role)}
                  </TableCell>
                </>
              ) : (
                <TableCell className="px-4 py-3">
                  <OrderStatusBadge status={order.status.name} />
                </TableCell>
              )}
              <TableCell className="min-w-40 px-4 py-3 whitespace-normal">
                {counterpartName(order, role)}
              </TableCell>
              <TableCell className="px-4 py-3 text-right">
                <Button variant="ghost" size="icon" asChild>
                  <Link
                    to={`/pedidos/${order.id}`}
                    aria-label={`Ver detalhes do pedido #${order.id}`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <EyeIcon />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
