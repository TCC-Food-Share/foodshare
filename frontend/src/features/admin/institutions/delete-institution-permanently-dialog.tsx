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
import { INSTITUTION_KIND_LABELS } from '@/features/admin/institutions/institution-kind';
import {
  type AdminInstitutionProfile,
  errorCode,
  INSTITUTION_ERROR_MESSAGES,
  INSTITUTIONS_QUERY_KEY,
  institutionsApi,
} from '@/features/admin/institutions/institutions-api';
import type { InstitutionDeletionTarget } from '@/features/admin/institutions/soft-delete-institution-dialog';

/** DT55: typed by the administrator, checked only on screen. */
const CONFIRMATION_WORD = 'EXCLUIR';

interface DeleteInstitutionPermanentlyDialogProps {
  target: InstitutionDeletionTarget | null;
  onClose: () => void;
  /** Runs after the deletion, before the cached details of the institution are dropped. */
  onDeleted?: () => void;
}

/** RF45, RF46: permanent deletion of an institution already soft deleted (DT54). */
export function DeleteInstitutionPermanentlyDialog({
  target,
  onClose,
  onDeleted,
}: DeleteInstitutionPermanentlyDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={(next) => !next && onClose()}>
      {target && (
        <DeleteInstitutionPermanentlyContent
          key={`${target.kind}-${target.id}`}
          target={target}
          onClose={onClose}
          onDeleted={onDeleted}
        />
      )}
    </Dialog>
  );
}

function deletionSummary(profile: AdminInstitutionProfile): string {
  const { foods, orders } = profile.activity;
  const orderCount = Object.values(orders).reduce((sum, count) => sum + count, 0);
  const ordersText = `${orderCount} pedido(s)`;
  if (!foods) return ordersText;
  const foodCount = foods.active + foods.reserved + foods.inactive + foods.deleted;
  return `${foodCount} alimento(s) e ${ordersText}`;
}

function DeleteInstitutionPermanentlyContent({
  target,
  onClose,
  onDeleted,
}: {
  target: InstitutionDeletionTarget;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const queryClient = useQueryClient();
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);

  const profile = useQuery({
    queryKey: [...INSTITUTIONS_QUERY_KEY, 'profile', target.kind, target.id],
    queryFn: () => institutionsApi.get(target.kind, target.id),
  });

  const mutation = useMutation({
    mutationFn: () => institutionsApi.remove(target.kind, target.id),
  });

  async function confirm() {
    setError(null);
    try {
      await mutation.mutateAsync();
    } catch (failure) {
      const code = errorCode(failure);
      setError(
        (code && INSTITUTION_ERROR_MESSAGES[code]) ??
          'Não foi possível excluir. Tente novamente em instantes.',
      );
      return;
    }
    toast.success(`Instituição "${target.name}" excluída permanentemente.`);
    onDeleted?.();
    onClose();
    // Drops the cached details of the institution, which no longer exists. Only inactive ones: the
    // profile page is still mounted until the navigation commits, and removing its query would
    // make it fetch again and get a 404. Only the list is refetched.
    queryClient.removeQueries({
      queryKey: INSTITUTIONS_QUERY_KEY,
      type: 'inactive',
      predicate: (query) => query.queryKey[2] !== 'list',
    });
    void queryClient.invalidateQueries({ queryKey: [...INSTITUTIONS_QUERY_KEY, 'list'] });
  }

  const confirmed = confirmation === CONFIRMATION_WORD;

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
              {INSTITUTION_KIND_LABELS[target.kind]} "{target.name}".
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>
            {profile.isLoading
              ? 'Calculando o que será apagado…'
              : profile.data
                ? `Esta ação não pode ser desfeita. A conta, o endereço, ${deletionSummary(profile.data)} e as sugestões feitas pela instituição serão apagados de vez, inclusive o histórico que a outra parte via.`
                : 'Esta ação não pode ser desfeita. A conta e todos os alimentos, pedidos e sugestões da instituição serão apagados de vez.'}
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-2">
          <Label htmlFor="permanent-deletion-confirmation">
            Para confirmar, digite {CONFIRMATION_WORD}
          </Label>
          <Input
            id="permanent-deletion-confirmation"
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
          disabled={!confirmed || mutation.isPending}
        >
          {mutation.isPending ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
          Excluir permanentemente
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
