import { HeartHandshakeIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import type { FoodListItem } from '@/features/foods/foods-api';
import { CreateOrderDialog } from '@/features/orders/create-order-dialog';
import { DuplicateOrderNotice } from '@/features/orders/duplicate-order-notice';
import { OrderLimitNotice } from '@/features/orders/order-limit-notice';
import { useOrdersInProgress } from '@/features/orders/use-orders-in-progress';

export function RequestDonationCard({ food }: { food: FoodListItem }) {
  const [open, setOpen] = useState(false);
  const outOfStock = Number(food.quantity) <= 0;
  const { limitReached, hasInProgressOrderFor } = useOrdersInProgress(!outOfStock);
  const duplicate = hasInProgressOrderFor(food.id);

  let support = (
    <p className="text-muted-foreground text-[13px] leading-relaxed">
      Solicite a doação para sua entidade beneficiária e ajude a combater o desperdício de
      alimentos.
    </p>
  );
  if (outOfStock) {
    support = (
      <p className="text-muted-foreground text-[13px] leading-relaxed">
        Este alimento não tem mais quantidade disponível.
      </p>
    );
  } else if (limitReached) {
    support = <OrderLimitNotice />;
  } else if (duplicate) {
    support = <DuplicateOrderNotice />;
  }

  return (
    <div className="border-border bg-card flex flex-col gap-3 rounded-lg border p-6">
      <h2 className="text-foreground text-base font-semibold">Interessado neste alimento?</h2>
      {support}
      <Button
        disabled={outOfStock || limitReached || duplicate}
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <HeartHandshakeIcon />
        Solicitar doação
      </Button>
      <CreateOrderDialog food={food} open={open} onOpenChange={setOpen} />
    </div>
  );
}
