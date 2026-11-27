import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlertIcon, Loader2Icon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { orderCountsSummary } from '@/features/admin/foods/admin-food-format';
import { ADMIN_FOODS_QUERY_KEY, adminFoodsApi } from '@/features/admin/foods/admin-foods-api';
import { ApiError } from '@/lib/api';

/** DT59, as in DT55: typed by the administrator, checked only on screen. */
const CONFIRMATION_WORD = 'EXCLUIR';

export interface FoodDeletionTarget {
  id: number;
  name: string;
  establishment: string;
}

interface DeleteFoodPermanentlyDialogProps {
  target: FoodDeletionTarget | null;
  onClose: () => void;
  /** Runs after the deletion, before the cached detail of the food is dropped. */
  onDeleted?: () => void;
}

/** RF51, DT59: deletes the food and every order of it, whatever their status. */
export function DeleteFoodPermanentlyDialog({
  target,
  onClose,
  onDeleted,
}: DeleteFoodPermanentlyDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={(next) => !next && onClose()}>
      {target && (
        <DeleteFoodPermanentlyContent
          key={target.id}
          target={target}
          onClose={onClose}
          onDeleted={onDeleted}
        />
      )}
    </Dialog>
  );
}

function DeleteFoodPermanentlyContent({
  target,
  onClose,
  onDeleted,
}: {
  target: FoodDeletionTarget;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const queryClient = useQueryClient();
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: [...ADMIN_FOODS_QUERY_KEY, 'detail', target.id],
    queryFn: () => adminFoodsApi.get(target.id),
  });

  const mutation = useMutation({ mutationFn: () => adminFoodsApi.remove(target.id) });

  async function confirm() {
    setError(null);
    try {
      await mutation.mutateAsync();
    } catch (failure) {
      setError(
        failure instanceof ApiError && failure.status === 404
          ? 'Este alimento já foi excluído. Atualize a página.'
          : 'Não foi possível excluir. Tente novamente em instantes.',
      );
      return;
    }
    toast.success(`Alimento "${target.name}" excluído permanentemente.`);
    onDeleted?.();
    onClose();
    // Only inactive queries: the detail page is still mounted until the navigation commits, and
    // removing its query would make it fetch again and get a 404. Only the list is refetched.
    queryClient.removeQueries({
      queryKey: ADMIN_FOODS_QUERY_KEY,
      type: 'inactive',
      predicate: (query) => query.queryKey[2] !== 'list',
    });
    void queryClient.invalidateQueries({ queryKey: [...ADMIN_FOODS_QUERY_KEY, 'list'] });
  }

  const summary = detail.data ? orderCountsSummary(detail.data.orders) : null;
  const ordersText = detail.isLoading
    ? 'Calculando o que será apagado…'
    : detail.data
      ? summary
        ? `Os pedidos dele também serão apagados: ${summary}. Quem fez ou recebeu esses pedidos deixa de vê-los.`
        : 'O alimento não tem pedidos.'
      : 'Todos os pedidos do alimento também serão apagados.';

  return (
    <DialogContent
      className="sm:max-w-xl"
      onInteractOutside={(event) => mutation.isPending && event.preventDefault()}
      onEscapeKeyDown={(event) => mutation.isPending && event.preventDefault()}
    >
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="bg-destructive/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Trash2Icon className="text-destructive size-[18px]" />
          </div>
          <div className="flex flex-col gap-0.5 text-left">
            <DialogTitle>Excluir permanentemente?</DialogTitle>
            <DialogDescription>
              "{target.name}", de {target.establishment}.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>
            Esta ação não pode ser desfeita. O alimento e a imagem serão apagados de vez.{' '}
            {ordersText}
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-2">
          <Label htmlFor="food-deletion-confirmation">
            Para confirmar, digite {CONFIRMATION_WORD}
          </Label>
          <Input
            id="food-deletion-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            disabled={mutation.isPending}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => void confirm()}
          disabled={confirmation !== CONFIRMATION_WORD || mutation.isPending}
        >
          {mutation.isPending ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
          Excluir permanentemente
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
