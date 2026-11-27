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
  type AdminInstitutionKind,
  INSTITUTION_KIND_LABELS,
} from '@/features/admin/institutions/institution-kind';
import {
  CANCELLATION_REASON_MESSAGES,
  errorCode,
  INSTITUTIONS_QUERY_KEY,
  institutionsApi,
} from '@/features/admin/institutions/institutions-api';
import { SoftDeleteFields } from '@/features/admin/institutions/soft-delete-fields';

export interface InstitutionDeletionTarget {
  kind: AdminInstitutionKind;
  id: number;
  name: string;
}

interface SoftDeleteInstitutionDialogProps {
  target: InstitutionDeletionTarget | null;
  onClose: () => void;
}

/** RF42, RF43: the "Excluir" action, the same operation as the `deleted` field of the edit (DT49). */
export function SoftDeleteInstitutionDialog({ target, onClose }: SoftDeleteInstitutionDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={(next) => !next && onClose()}>
      {target && (
        <SoftDeleteInstitutionContent
          key={`${target.kind}-${target.id}`}
          target={target}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}

function SoftDeleteInstitutionContent({
  target,
  onClose,
}: {
  target: InstitutionDeletionTarget;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [reasonId, setReasonId] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (cancellationReasonId: number) =>
      institutionsApi.update(target.kind, target.id, { deleted: true, cancellationReasonId }, null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INSTITUTIONS_QUERY_KEY }),
  });

  async function confirm() {
    setError(null);
    try {
      await mutation.mutateAsync(Number(reasonId));
      toast.success(`Instituição "${target.name}" excluída.`);
      onClose();
    } catch (failure) {
      const code = errorCode(failure);
      if (code && code in CANCELLATION_REASON_MESSAGES) {
        setReasonError(CANCELLATION_REASON_MESSAGES[code]);
        return;
      }
      setError('Não foi possível excluir. Tente novamente em instantes.');
    }
  }

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
            <DialogTitle>Excluir instituição?</DialogTitle>
            <DialogDescription>
              {INSTITUTION_KIND_LABELS[target.kind]} "{target.name}". A exclusão é lógica: a
              instituição pode ser restaurada depois pela edição.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <SoftDeleteFields
          kind={target.kind}
          id={target.id}
          trigger="Ao confirmar"
          reasonId={reasonId}
          onReasonChange={(next) => {
            setReasonId(next);
            setReasonError(null);
          }}
          reasonError={reasonError}
        />
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
          disabled={!reasonId || mutation.isPending}
        >
          {mutation.isPending ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
          Excluir
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
