import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  type AdminAdministrator,
  ADMINISTRATOR_ERROR_MESSAGES,
  ADMINISTRATORS_QUERY_KEY,
  administratorsApi,
} from '@/features/admin/administrators/administrators-api';
import { adminErrorCode } from '@/features/admin/lists/use-admin-list-save';

interface DeleteAdministratorDialogProps {
  open: boolean;
  target: AdminAdministrator | null;
  onClose: () => void;
}

export function DeleteAdministratorDialog({
  open,
  target,
  onClose,
}: DeleteAdministratorDialogProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (id: number) => administratorsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMINISTRATORS_QUERY_KEY }),
  });

  function close() {
    if (mutation.isPending) return;
    setError(null);
    onClose();
  }

  async function confirm() {
    if (!target) return;
    setError(null);
    try {
      await mutation.mutateAsync(target.id);
      toast.success(`Administrador "${target.name}" excluído.`);
      onClose();
    } catch (failure) {
      const code = adminErrorCode(failure);
      setError(
        (code && ADMINISTRATOR_ERROR_MESSAGES[code]) ??
          'Não foi possível excluir. Tente novamente em instantes.',
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-destructive/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Trash2Icon className="text-destructive size-[18px]" />
            </div>
            <div className="flex flex-col gap-0.5 text-left">
              <DialogTitle>Excluir administrador?</DialogTitle>
              <DialogDescription>
                A conta de "{target?.name}" ({target?.email}) será excluída permanentemente, com as
                sessões abertas. Esta ação não pode ser desfeita.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void confirm()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
