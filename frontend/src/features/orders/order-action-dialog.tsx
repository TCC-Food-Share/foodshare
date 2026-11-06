import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckIcon,
  CircleAlertIcon,
  InfoIcon,
  Loader2Icon,
  PackageCheckIcon,
  XIcon,
} from 'lucide-react';
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
import {
  acceptImpactProblem,
  dialogCopy,
  ORDER_ACTIONS,
  type OrderAction,
} from '@/features/orders/order-actions';
import {
  type AcceptImpact,
  acceptImpactKey,
  conflictCode,
  getAcceptImpact,
  type OrderDetail,
} from '@/features/orders/orders-api';
import { type ActionOutcome, useOrderAction } from '@/features/orders/use-order-action';
import { cn } from '@/lib/cn';

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

function AcceptEffect({ impact, remaining }: { impact: AcceptImpact; remaining?: string }) {
  const lines: string[] = [];
  if (impact.pendingOrdersToReject > 0) {
    lines.push(
      `${impact.pendingOrdersToReject} ${plural(
        impact.pendingOrdersToReject,
        'pedido pendente deste alimento será rejeitado',
        'pedidos pendentes deste alimento serão rejeitados',
      )}.`,
    );
  }
  if (impact.totalOrdersToUpdate > 0) {
    lines.push(
      `${impact.totalOrdersToUpdate} ${plural(
        impact.totalOrdersToUpdate,
        'pedido total pendente passará',
        'pedidos totais pendentes passarão',
      )} a pedir ${remaining}.`,
    );
  }
  if (impact.foodWillBeReserved) {
    lines.push('O alimento ficará Reservado e sairá do feed.');
  }
  if (lines.length === 0) return null;

  return (
    <Alert>
      <InfoIcon />
      <AlertDescription>
        <ul className="flex flex-col gap-1">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

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
  const queryClient = useQueryClient();
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

  // Keyed outside ['orders'] so the invalidation after a successful accept does not
  // refetch the preview of an order that is no longer pending.
  const impactQuery = useQuery({
    queryKey: acceptImpactKey(order.id),
    queryFn: async () => {
      try {
        return await getAcceptImpact(order.id);
      } catch (error) {
        if (conflictCode(error)) void queryClient.invalidateQueries({ queryKey: ['orders'] });
        throw error;
      }
    },
    enabled: open && action === 'accept' && !isPending,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  const awaitingImpact = action === 'accept' && (!impactQuery.data || impactQuery.isFetching);

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

        {action === 'accept' && impactQuery.data && !impactQuery.isFetching && (
          <AcceptEffect impact={impactQuery.data} remaining={copy.remaining} />
        )}

        {action === 'accept' && impactQuery.isError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>
              {acceptImpactProblem(conflictCode(impactQuery.error))}
            </AlertDescription>
          </Alert>
        )}

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
            disabled={isPending || awaitingImpact}
          >
            {(isPending || impactQuery.isFetching) && <Loader2Icon className="animate-spin" />}
            {config.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
