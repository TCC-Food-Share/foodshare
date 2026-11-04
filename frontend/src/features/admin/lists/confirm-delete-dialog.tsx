import { useMutation } from '@tanstack/react-query';
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
  ADMIN_LIST_ERROR_MESSAGES,
  adminListApi,
  type AdminListResource,
} from '@/features/admin/lists/list-api';
import { adminErrorCode, useAdminListInvalidate } from '@/features/admin/lists/use-admin-list-save';

interface ConfirmDeleteDialogProps {
  resource: AdminListResource;
  target: { id: number; label: string } | null;
  onClose: () => void;
}

export function ConfirmDeleteDialog({ resource, target, onClose }: ConfirmDeleteDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const invalidate = useAdminListInvalidate(resource);
  const mutation = useMutation({
    mutationFn: (id: number) => adminListApi(resource).remove(id),
    onSuccess: invalidate,
  });

  function close() {
    setError(null);
    onClose();
  }

  async function confirm() {
    if (!target) return;
    setError(null);
    try {
      await mutation.mutateAsync(target.id);
      toast.success(`"${target.label}" excluído.`);
      close();
    } catch (failure) {
      const code = adminErrorCode(failure);
      setError(
        (code && ADMIN_LIST_ERROR_MESSAGES[code]) ??
          'Não foi possível excluir. Tente novamente em instantes.',
      );
    }
  }

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-destructive/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Trash2Icon className="text-destructive size-[18px]" />
            </div>
            <div className="flex flex-col gap-0.5 text-left">
              <DialogTitle>Excluir registro?</DialogTitle>
              <DialogDescription>
                "{target?.label}" será excluído. Esta ação não pode ser desfeita.
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
