import { useMutation } from '@tanstack/react-query';
import { CircleAlertIcon, Loader2Icon, XIcon } from 'lucide-react';
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
import { adminErrorCode } from '@/features/admin/lists/use-admin-list-save';
import {
  type AdminSuggestion,
  ALREADY_REVIEWED_MESSAGE,
  rejectSuggestion,
  useSuggestionsInvalidate,
} from '@/features/admin/suggestions/admin-suggestions-api';

interface RejectSuggestionDialogProps {
  suggestion: AdminSuggestion | null;
  onClose: () => void;
}

export function RejectSuggestionDialog({ suggestion, onClose }: RejectSuggestionDialogProps) {
  const [failed, setFailed] = useState(false);
  const invalidate = useSuggestionsInvalidate();
  const mutation = useMutation({ mutationFn: rejectSuggestion });

  function close() {
    setFailed(false);
    onClose();
  }

  async function confirm() {
    if (!suggestion) return;
    setFailed(false);
    try {
      await mutation.mutateAsync(suggestion.id);
      toast.success('Sugestão recusada.');
      await invalidate();
      close();
    } catch (error) {
      if (adminErrorCode(error) === 'SUGGESTION_ALREADY_REVIEWED') {
        toast.error(ALREADY_REVIEWED_MESSAGE);
        await invalidate();
        close();
        return;
      }
      setFailed(true);
    }
  }

  return (
    <Dialog open={suggestion !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-destructive/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
              <XIcon className="text-destructive size-[18px]" />
            </div>
            <div className="flex flex-col gap-0.5 text-left">
              <DialogTitle>Recusar sugestão?</DialogTitle>
              <DialogDescription>
                "{suggestion?.text}" ficará registrada como recusada, sem criar nenhuma opção.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {failed && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>
              Não foi possível recusar. Tente novamente em instantes.
            </AlertDescription>
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
            {mutation.isPending ? <Loader2Icon className="animate-spin" /> : <XIcon />}
            Recusar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
