import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { conflictMessage, ORDER_ACTIONS, type OrderAction } from '@/features/orders/order-actions';
import { getOrder, type OrderDetail, orderDetailKey } from '@/features/orders/orders-api';
import { ApiError } from '@/lib/api';

export type ActionOutcome = 'done' | 'conflict' | 'not-found' | 'retry';

export function useOrderAction(order: OrderDetail) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const mutation = useMutation({
    mutationFn: (action: OrderAction) => ORDER_ACTIONS[action].call(order.id),
  });

  async function run(action: OrderAction): Promise<ActionOutcome> {
    try {
      await mutation.mutateAsync(action);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: ['orders'] });
        const fresh = await queryClient
          .fetchQuery({
            queryKey: orderDetailKey(order.id),
            queryFn: () => getOrder(order.id),
            staleTime: 0,
          })
          .catch(() => null);
        toast.error(conflictMessage(action, fresh));
        return 'conflict';
      }
      if (error instanceof ApiError && error.status === 404) {
        void queryClient.invalidateQueries({ queryKey: ['orders'] });
        toast.error('Pedido não encontrado.');
        return 'not-found';
      }
      return 'retry';
    }

    await queryClient.invalidateQueries({ queryKey: ['orders'] });
    if (action === 'accept') {
      void queryClient.invalidateQueries({ queryKey: ['foods'] });
      void queryClient.invalidateQueries({ queryKey: ['food'] });
    }
    toast.success(ORDER_ACTIONS[action].success);
    return 'done';
  }

  async function execute(action: OrderAction): Promise<ActionOutcome> {
    setBusy(true);
    try {
      return await run(action);
    } finally {
      setBusy(false);
    }
  }

  return { execute, isPending: busy };
}
