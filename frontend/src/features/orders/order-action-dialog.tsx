import { CheckIcon, CircleAlertIcon, Loader2Icon, PackageCheckIcon, XIcon } from 'lucide-react';
import { useState } from 'react';

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
import { dialogCopy, ORDER_ACTIONS, type OrderAction } from '@/features/orders/order-actions';
import type { OrderDetail } from '@/features/orders/orders-api';
import { type ActionOutcome, useOrderAction } from '@/features/orders/use-order-action';
import { cn } from '@/lib/cn';

const ACTION_ICONS = {
  accept: CheckIcon,
  reject: XIcon,
  receive: PackageCheckIcon,
};

interface OrderActionDialogProps {
  order: OrderDetail;
  action: OrderAction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinished: (outcome: Exclude<ActionOutcome, 'retry'>) => void;
  onCloseAutoFocus?: (event: Event) => void;
}

export function OrderActionDialog({
  order,
  action,
  open,
  onOpenChange,
  onFinished,
  onCloseAutoFocus,
}: OrderActionDialogProps) {
  const { execute, isPending } = useOrderAction(order);
  const [failed, setFailed] = useState(false);
  const [copy, setCopy] = useState(() => dialogCopy(action, order));

  // Every reopen starts without the previous failure banner and with the text
  // computed from the order as it was when the dialog opened (the refetch after
  // the action changes the stock while the dialog is still on screen) — adjusting
  // state during render (not an effect) to avoid a cascading setState-in-effect render.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFailed(false);
      setCopy(dialogCopy(action, order));
    }
  }

  const config = ORDER_ACTIONS[action];
  const Icon = ACTION_ICONS[action];

  async function confirm() {
    setFailed(false);
    const outcome = await execute(action);
    if (outcome === 'retry') setFailed(true);
    else onFinished(outcome);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader className="pr-6">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-lg',
                config.destructive ? 'bg-destructive' : 'bg-primary',
              )}
            >
              <Icon className="size-5 text-white" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <DialogTitle>{copy.title}</DialogTitle>
              <DialogDescription>{copy.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {failed && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>
              Não foi possível {config.failure}. Tente novamente em instantes.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant={config.destructive ? 'destructive' : 'default'}
            onClick={() => void confirm()}
            disabled={isPending}
          >
            {isPending && <Loader2Icon className="animate-spin" />}
            {config.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
