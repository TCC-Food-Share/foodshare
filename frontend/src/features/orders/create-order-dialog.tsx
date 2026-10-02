import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleAlertIcon, HeartHandshakeIcon, InfoIcon, Loader2Icon, SendIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router-dom';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { FoodListItem } from '@/features/foods/foods-api';
import {
  type CreateOrderInput,
  createOrderSchema,
  DEFAULT_VALUES,
} from '@/features/orders/create-order-schema';
import { DuplicateOrderNotice } from '@/features/orders/duplicate-order-notice';
import { OrderLimitNotice } from '@/features/orders/order-limit-notice';
import { conflictCode, createOrder, ORDER_CONFLICT_CODES } from '@/features/orders/orders-api';
import { ApiError } from '@/lib/api';
import { formatQuantity } from '@/lib/format';

type ServerError = 'invalid' | 'network';
type BlockedReason = 'limit' | 'duplicate';

const STEPS = [
  'Sua solicitação será enviada ao estabelecimento para análise.',
  'O estabelecimento analisará sua solicitação e poderá aceitá-la ou recusá-la.',
  'Se aceitar, a quantidade solicitada fica reservada para a sua entidade.',
  'Ao receber o alimento, confirme o recebimento em Meus pedidos.',
];

function blockedReason(code: string | undefined): BlockedReason | null {
  if (code === ORDER_CONFLICT_CODES.limitReached) return 'limit';
  if (code === ORDER_CONFLICT_CODES.duplicateInProgress) return 'duplicate';
  return null;
}

function bannerText(error: ServerError): string {
  return error === 'invalid'
    ? 'Não foi possível enviar: a quantidade pode ter mudado. Confira o valor e tente novamente.'
    : 'Não foi possível enviar a solicitação. Tente novamente em instantes.';
}

function HowItWorks() {
  return (
    <div className="bg-primary/5 border-primary/20 flex flex-col gap-3 rounded-lg border p-4">
      <div className="text-primary flex items-center gap-2 text-sm font-semibold">
        <InfoIcon className="size-4" />
        Como funciona o processo
      </div>
      <ol className="flex flex-col gap-2">
        {STEPS.map((step, index) => (
          <li key={step} className="flex items-start gap-2">
            <span className="bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-medium">
              {index + 1}
            </span>
            <span className="text-foreground/80 text-[13px] leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function QuantityOption({
  id,
  value,
  title,
  description,
}: {
  id: string;
  value: CreateOrderInput['mode'];
  title: string;
  description: string;
}) {
  return (
    <label
      htmlFor={id}
      className="group border-border bg-card has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary has-[[data-state=checked]]:text-primary-foreground has-focus-visible:ring-ring/50 flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors has-focus-visible:ring-[3px]"
    >
      <RadioGroupItem id={id} value={value} className="bg-white dark:bg-white" />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-muted-foreground group-has-[[data-state=checked]]:text-primary-foreground/80 text-xs">
          {description}
        </span>
      </span>
    </label>
  );
}

export function CreateOrderDialog({
  food,
  open,
  onOpenChange,
}: {
  food: FoodListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<ServerError | null>(null);
  const [blocked, setBlocked] = useState<BlockedReason | null>(null);

  const available = Number(food.quantity);
  const availableLabel = `${formatQuantity(food.quantity)} ${food.quantityUnit}`;
  const schema = useMemo(() => createOrderSchema(available), [available]);

  const form = useForm<CreateOrderInput>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: DEFAULT_VALUES,
  });

  // Every reopen starts from a clean form — adjusting state during render
  // (not an effect) to avoid a cascading setState-in-effect render.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      form.reset(DEFAULT_VALUES);
      setServerError(null);
      setBlocked(null);
    }
  }

  const mutation = useMutation({ mutationFn: createOrder });
  const mode = useWatch({ control: form.control, name: 'mode' });

  async function onSubmit(values: CreateOrderInput) {
    setServerError(null);
    const quantity = values.mode === 'total' ? available : Number(values.quantity);
    try {
      await mutation.mutateAsync({ foodId: food.id, quantity });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Solicitação enviada ao estabelecimento.');
      onOpenChange(false);
    } catch (error) {
      const reason = blockedReason(conflictCode(error));
      if (reason) {
        void queryClient.invalidateQueries({ queryKey: ['orders'] });
        setBlocked(reason);
      } else if (error instanceof ApiError && error.status === 404) {
        void queryClient.invalidateQueries({ queryKey: ['food', food.id] });
        void queryClient.invalidateQueries({ queryKey: ['foods'] });
        toast.error('Este alimento não está mais disponível.');
        onOpenChange(false);
      } else if (error instanceof ApiError && error.status === 400) {
        void queryClient.invalidateQueries({ queryKey: ['food', food.id] });
        setServerError('invalid');
      } else {
        setServerError('network');
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
              <HeartHandshakeIcon className="text-primary-foreground size-5" />
            </div>
            <div className="flex flex-col gap-0.5 text-left">
              <DialogTitle>Solicitar Doação</DialogTitle>
              <DialogDescription>
                {food.name} · {availableLabel} disponíveis
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {blocked ? (
          <>
            {blocked === 'limit' ? <OrderLimitNotice /> : <DuplicateOrderNotice />}
            <DialogFooter className="mt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button asChild>
                <Link to="/pedidos">Ver meus pedidos</Link>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {serverError && (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertDescription>{bannerText(serverError)}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={(e) => e.preventDefault()} noValidate className="flex flex-col gap-5">
                <HowItWorks />

                <div className="flex flex-col gap-1">
                  <h3 className="text-foreground text-sm font-semibold">Quantidade desejada</h3>
                  <p className="text-muted-foreground text-[13px]">
                    Selecione se deseja solicitar todo o alimento disponível ou apenas uma parte.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="mode"
                  render={({ field }) => (
                    <FormItem>
                      <RadioGroup
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (value === 'total') form.clearErrors('quantity');
                        }}
                        aria-label="Quantidade desejada"
                      >
                        <QuantityOption
                          id="order-mode-total"
                          value="total"
                          title="Quantidade total"
                          description={`Solicitar todas as ${availableLabel} disponíveis`}
                        />
                        <QuantityOption
                          id="order-mode-partial"
                          value="partial"
                          title="Quantidade parcial"
                          description="Informe a quantidade que deseja solicitar"
                        />
                      </RadioGroup>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade solicitada</FormLabel>
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <FormControl>
                            <Input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              max={available}
                              placeholder="Ex: 20"
                              className="pr-20"
                              disabled={mode === 'total'}
                              {...field}
                              value={mode === 'total' ? formatQuantity(food.quantity) : field.value}
                            />
                          </FormControl>
                          <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm">
                            {food.quantityUnit}
                          </span>
                        </div>
                        <span className="text-muted-foreground shrink-0 text-xs">
                          máx. {availableLabel}
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={mutation.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    disabled={mutation.isPending}
                    onClick={() => void form.handleSubmit(onSubmit)()}
                  >
                    {mutation.isPending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
                    {mutation.isPending ? 'Enviando…' : 'Enviar solicitação'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
