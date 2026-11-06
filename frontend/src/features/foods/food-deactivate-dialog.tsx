import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleAlertIcon, Loader2Icon } from 'lucide-react';
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
import { myFoodErrorMessage } from '@/features/foods/my-food-errors';
import { deactivateFood, type MyFood } from '@/features/foods/my-foods-api';

function DeactivateBody({ food, onClose }: { food: MyFood; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: () => deactivateFood(food.id) });

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['foods'] }),
      queryClient.invalidateQueries({ queryKey: ['food'] }),
      queryClient.invalidateQueries({ queryKey: ['orders'] }),
    ]);
  }

  async function confirm() {
    setServerError(null);
    try {
      await mutation.mutateAsync();
      await refresh();
      toast.success('Alimento desativado.');
      onClose();
    } catch (error) {
      setServerError(myFoodErrorMessage(error));
      void refresh();
    }
  }

  return (
    <>
      {serverError && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button type="button" onClick={() => void confirm()} disabled={mutation.isPending}>
          {mutation.isPending && <Loader2Icon className="animate-spin" />}
          {mutation.isPending ? 'Desativando…' : 'Desativar'}
        </Button>
      </DialogFooter>
    </>
  );
}

export function FoodDeactivateDialog({
  food,
  onClose,
}: {
  food: MyFood | null;
  onClose: () => void;
}) {
  const pending = food?.pendingOrders ?? 0;

  return (
    <Dialog open={food !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Desativar {food?.name}?</DialogTitle>
          <DialogDescription>
            O alimento sai do feed até ser reativado.
            {pending === 1 && ' 1 pedido pendente será rejeitado.'}
            {pending > 1 && ` ${pending} pedidos pendentes serão rejeitados.`}
          </DialogDescription>
        </DialogHeader>
        {food && <DeactivateBody key={food.id} food={food} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}
