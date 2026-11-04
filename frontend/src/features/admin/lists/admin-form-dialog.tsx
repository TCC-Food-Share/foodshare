import { CircleAlertIcon, Loader2Icon, type LucideIcon, SaveIcon } from 'lucide-react';
import type { ReactNode } from 'react';

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

interface AdminFormDialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: LucideIcon;
  title: string;
  description: string;
  error: string | null;
  pending: boolean;
  onSubmit: () => void;
  children: ReactNode;
}

export function AdminFormDialogShell({
  open,
  onOpenChange,
  icon: Icon,
  title,
  description,
  error,
  pending,
  onSubmit,
  children,
}: AdminFormDialogShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 pr-8">
            <div className="bg-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Icon className="text-primary-foreground size-[18px]" />
            </div>
            <div className="flex flex-col gap-0.5 text-left">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {children}
          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const GENERIC_SAVE_ERROR = 'Não foi possível salvar. Tente novamente em instantes.';

export function RequiredMark() {
  return <span className="text-destructive">*</span>;
}
