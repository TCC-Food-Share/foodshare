import { TriangleAlertIcon } from 'lucide-react';
import { useRef, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { Role } from '@/features/auth/auth-context';
import { OrderActionDialog } from '@/features/orders/order-action-dialog';
import {
  availableActions,
  insufficientStock,
  ORDER_ACTIONS,
  type OrderAction,
  situationText,
} from '@/features/orders/order-actions';
import type { OrderDetail } from '@/features/orders/orders-api';
import type { ActionOutcome } from '@/features/orders/use-order-action';
import { formatQuantity } from '@/lib/format';

interface OrderActionsCardProps {
  order: OrderDetail;
  role: Role | null;
  onNotFound: () => void;
}

export function OrderActionsCard({ order, role, onNotFound }: OrderActionsCardProps) {
  const actions = availableActions(role, order.status.name);
  const [action, setAction] = useState<OrderAction>('accept');
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const focusCardOnClose = useRef(false);

  const lowStock = actions.includes('accept') && insufficientStock(order);
  const unit = order.food.quantityUnit;

  function openDialog(next: OrderAction, opener: HTMLButtonElement) {
    openerRef.current = opener;
    setAction(next);
    setOpen(true);
  }

  function handleFinished(outcome: Exclude<ActionOutcome, 'retry'>) {
    focusCardOnClose.current = outcome !== 'not-found';
    setOpen(false);
    if (outcome === 'not-found') onNotFound();
  }

  // The buttons are not a Radix `DialogTrigger`, so on close Radix would leave focus on <body>.
  function handleCloseAutoFocus(event: Event) {
    event.preventDefault();
    const target = focusCardOnClose.current ? cardRef.current : openerRef.current;
    focusCardOnClose.current = false;
    target?.focus();
  }

  return (
    <section
      ref={cardRef}
      tabIndex={-1}
      className="border-border bg-card focus-visible:ring-ring/50 flex flex-col gap-4 rounded-lg border p-6 outline-none focus-visible:ring-[3px]"
    >
      <h2 className="text-foreground text-lg font-semibold">
        {actions.length > 0 ? 'Ações do pedido' : 'Situação do pedido'}
      </h2>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {situationText(role, order.status.name)}
      </p>

      {lowStock && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle className="line-clamp-none">Estoque insuficiente para aceitar</AlertTitle>
          <AlertDescription>
            <p>
              Disponível: {formatQuantity(order.food.quantity)} {unit}. Pedido:{' '}
              {formatQuantity(order.quantity)} {unit}. Você ainda pode rejeitar o pedido.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {actions.length > 0 && (
        <div className="flex flex-col gap-2">
          {actions.map((item) => (
            <Button
              key={item}
              variant={item === 'reject' ? 'outline' : 'default'}
              className={
                item === 'reject'
                  ? 'text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive'
                  : undefined
              }
              disabled={item === 'accept' && lowStock}
              onClick={(event) => openDialog(item, event.currentTarget)}
            >
              {ORDER_ACTIONS[item].label}
            </Button>
          ))}
        </div>
      )}

      <OrderActionDialog
        order={order}
        action={action}
        open={open}
        onOpenChange={setOpen}
        onFinished={handleFinished}
        onCloseAutoFocus={handleCloseAutoFocus}
      />
    </section>
  );
}
