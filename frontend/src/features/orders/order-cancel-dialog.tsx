import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BanIcon, CircleAlertIcon, Loader2Icon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { SearchableSelect } from '@/components/searchable-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useCancellationReasons } from '@/features/catalog/catalog-api';
import { apiErrorCode } from '@/features/foods/my-food-errors';
import { ALREADY_UPDATED } from '@/features/orders/order-actions';
import { ORDER_STATUS } from '@/features/orders/order-status';
import {
  cancelOrder,
  getOrder,
  type OrderDetail,
  orderDetailKey,
} from '@/features/orders/orders-api';
import type { ActionOutcome } from '@/features/orders/use-order-action';
import {
  type SuggestionDraft,
  SuggestOptionDialog,
} from '@/features/suggestions/suggest-option-dialog';
import { ApiError } from '@/lib/api';
import { formatQuantity } from '@/lib/format';

const REASON_FIELD_ID = 'cancel-order-reason';

// Mirrors the 400 codes of PATCH /orders/:id/cancel (backend/src/orders/cancellation-reason.ts).
const REASON_REQUIRED = 'CANCELLATION_REASON_REQUIRED';
const INVALID_REASON = 'INVALID_CANCELLATION_REASON';

function cancelCopy(order: OrderDetail): { title: string; description: string } {
  const effect =
    order.status.name === ORDER_STATUS.IN_PROGRESS
      ? `${formatQuantity(order.quantity)} ${order.food.quantityUnit} voltam ao estoque de ${order.food.name}.`
      : 'O estoque do alimento não muda.';
  return {
    title: `Cancelar o pedido #${order.id}?`,
    description: `O pedido será encerrado como Cancelado. ${effect} Esta ação não pode ser desfeita.`,
  };
}

interface OrderCancelDialogProps {
  order: OrderDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinished: (outcome: Exclude<ActionOutcome, 'retry'>) => void;
  onCloseAutoFocus?: (event: Event) => void;
}

export function OrderCancelDialog({
  order,
  open,
  onOpenChange,
  onFinished,
  onCloseAutoFocus,
}: OrderCancelDialogProps) {
  const queryClient = useQueryClient();
  const [reasonId, setReasonId] = useState('');
  const [reasonMissing, setReasonMissing] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<SuggestionDraft | null>(null);
  const [copy, setCopy] = useState(() => cancelCopy(order));

  // Every reopen starts clean, with the text of the order as it was when the dialog opened
  // (the refetch after cancelling changes the status while the dialog is still on screen).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setReasonId('');
      setReasonMissing(false);
      setServerError(null);
      setCopy(cancelCopy(order));
    }
  }

  const reasonsQuery = useCancellationReasons();
  const reasonOptions = useMemo(
    () =>
      (reasonsQuery.data ?? []).map((reason) => ({
        value: String(reason.id),
        label: reason.name,
      })),
    [reasonsQuery.data],
  );

  const mutation = useMutation({
    mutationFn: () => cancelOrder(order.id, Number(reasonId)),
  });

  async function handleConflict() {
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
    await queryClient
      .fetchQuery({
        queryKey: orderDetailKey(order.id),
        queryFn: () => getOrder(order.id),
        staleTime: 0,
      })
      .catch(() => null);
    toast.error(ALREADY_UPDATED);
    onFinished('conflict');
  }

  async function confirm() {
    if (!reasonId) {
      setReasonMissing(true);
      return;
    }
    setServerError(null);
    try {
      await mutation.mutateAsync();
    } catch (error) {
      const code = apiErrorCode(error);
      if (error instanceof ApiError && error.status === 409) {
        await handleConflict();
      } else if (error instanceof ApiError && error.status === 404) {
        void queryClient.invalidateQueries({ queryKey: ['orders'] });
        toast.error('Pedido não encontrado.');
        onFinished('not-found');
      } else if (code === INVALID_REASON) {
        setReasonId('');
        void reasonsQuery.refetch();
        setServerError('Este motivo não está mais disponível. Escolha outro.');
      } else if (code === REASON_REQUIRED) {
        setReasonMissing(true);
      } else {
        setServerError('Não foi possível cancelar o pedido. Tente novamente em instantes.');
      }
      return;
    }

    // The stock and the status of the food may have changed (RN09).
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['orders'] }),
      queryClient.invalidateQueries({ queryKey: ['foods'] }),
      queryClient.invalidateQueries({ queryKey: ['food'] }),
    ]);
    toast.success('Pedido cancelado.');
    onFinished('done');
  }

  const busy = mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader className="pr-6">
          <div className="flex items-start gap-3">
            <div className="bg-destructive flex size-9 shrink-0 items-center justify-center rounded-lg">
              <BanIcon className="size-5 text-white" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <DialogTitle>{copy.title}</DialogTitle>
              <DialogDescription>{copy.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor={REASON_FIELD_ID}>Motivo do cancelamento</Label>
          <SearchableSelect
            id={REASON_FIELD_ID}
            options={reasonOptions}
            value={reasonId}
            onChange={(value) => {
              setReasonId(value);
              setReasonMissing(false);
            }}
            placeholder={reasonsQuery.isLoading ? 'Carregando…' : 'Selecione o motivo'}
            searchPlaceholder="Buscar motivo…"
            emptyMessage="Nenhum motivo encontrado."
            disabled={reasonsQuery.isLoading || busy}
            invalid={reasonMissing}
            onSuggest={(text) => setSuggestion({ type: 'CANCELLATION_REASON', text })}
          />
          {reasonMissing && (
            <p className="text-destructive text-sm">Selecione o motivo do cancelamento.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={() => void confirm()} disabled={busy}>
            {busy && <Loader2Icon className="animate-spin" />}
            Cancelar pedido
          </Button>
        </DialogFooter>

        <SuggestOptionDialog draft={suggestion} onClose={() => setSuggestion(null)} />
      </DialogContent>
    </Dialog>
  );
}
