import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleAlertIcon, Loader2Icon, Trash2Icon } from 'lucide-react';
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
import { apiErrorCode, myFoodErrorMessage } from '@/features/foods/my-food-errors';
import { deleteFood, type MyFood } from '@/features/foods/my-foods-api';
import {
  type SuggestionDraft,
  SuggestOptionDialog,
} from '@/features/suggestions/suggest-option-dialog';

const REASON_FIELD_ID = 'delete-food-reason';

function DeleteBody({ food, onClose }: { food: MyFood; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [reasonId, setReasonId] = useState('');
  const [reasonMissing, setReasonMissing] = useState(false);
  const [reasonRequired, setReasonRequired] = useState(food.inProgressOrders > 0);
  const [suggestion, setSuggestion] = useState<SuggestionDraft | null>(null);

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
    mutationFn: () => deleteFood(food.id, reasonRequired ? Number(reasonId) : undefined),
  });

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['foods'] }),
      queryClient.invalidateQueries({ queryKey: ['food'] }),
      queryClient.invalidateQueries({ queryKey: ['orders'] }),
    ]);
  }

  async function confirm() {
    if (reasonRequired && !reasonId) {
      setReasonMissing(true);
      return;
    }
    setServerError(null);
    try {
      await mutation.mutateAsync();
      await refresh();
      toast.success('Alimento excluído.');
      onClose();
    } catch (error) {
      if (apiErrorCode(error) === 'CANCELLATION_REASON_REQUIRED') setReasonRequired(true);
      if (apiErrorCode(error) === 'INVALID_CANCELLATION_REASON') {
        setReasonId('');
        void reasonsQuery.refetch();
      }
      setServerError(myFoodErrorMessage(error));
      void refresh();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {serverError && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      {reasonRequired && (
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
            disabled={reasonsQuery.isLoading}
            invalid={reasonMissing}
            onSuggest={(text) => setSuggestion({ type: 'CANCELLATION_REASON', text })}
          />
          {reasonMissing && (
            <p className="text-destructive text-sm">Selecione o motivo do cancelamento.</p>
          )}
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => void confirm()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
          {mutation.isPending ? 'Excluindo…' : 'Excluir'}
        </Button>
      </DialogFooter>

      <SuggestOptionDialog draft={suggestion} onClose={() => setSuggestion(null)} />
    </div>
  );
}

function effectText(food: MyFood | null): string {
  const pending = food?.pendingOrders ?? 0;
  const inProgress = food?.inProgressOrders ?? 0;
  const parts = ['O alimento sai da sua lista e do feed, e não pode ser recuperado.'];
  if (pending === 1) parts.push('1 pedido pendente será rejeitado.');
  if (pending > 1) parts.push(`${pending} pedidos pendentes serão rejeitados.`);
  if (inProgress === 1) parts.push('1 pedido em andamento será cancelado.');
  if (inProgress > 1) parts.push(`${inProgress} pedidos em andamento serão cancelados.`);
  return parts.join(' ');
}

export function FoodDeleteDialog({ food, onClose }: { food: MyFood | null; onClose: () => void }) {
  return (
    <Dialog open={food !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir {food?.name}?</DialogTitle>
          <DialogDescription>{effectText(food)}</DialogDescription>
        </DialogHeader>
        {food && <DeleteBody key={food.id} food={food} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}
