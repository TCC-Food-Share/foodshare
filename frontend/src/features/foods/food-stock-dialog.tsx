import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlertIcon, InfoIcon, Loader2Icon, SaveIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import { FOOD_QUANTITY_MESSAGES } from '@/features/foods/food-quantity';
import {
  createFoodStockSchema,
  EXPIRATION_IN_PAST_MESSAGE,
  expirationIsoOf,
  type FoodStockValues,
} from '@/features/foods/food-stock-schema';
import { apiErrorCode, myFoodErrorMessage } from '@/features/foods/my-food-errors';
import {
  getQuantityImpact,
  type MyFood,
  reactivateFood,
  updateFood,
} from '@/features/foods/my-foods-api';
import { formatQuantity } from '@/lib/format';

export type FoodStockMode = 'edit' | 'reactivate';

const IMPACT_DELAY_MS = 300;

const COPY: Record<
  FoodStockMode,
  { title: string; description: string; submit: string; pending: string; success: string }
> = {
  edit: {
    title: 'Editar alimento',
    description: 'Só a validade e a quantidade podem ser alteradas.',
    submit: 'Salvar',
    pending: 'Salvando…',
    success: 'Alimento atualizado.',
  },
  reactivate: {
    title: 'Reativar alimento',
    description: 'Informe a nova validade e a nova quantidade para o alimento voltar ao feed.',
    submit: 'Reativar',
    pending: 'Reativando…',
    success: 'Alimento reativado.',
  },
};

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

function useDelayedValue<T>(value: T, delay: number): T {
  const [delayed, setDelayed] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDelayed(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return delayed;
}

function defaultsFor(food: MyFood, mode: FoodStockMode): FoodStockValues {
  return mode === 'edit'
    ? { expirationDate: expirationIsoOf(food), quantity: formatQuantity(food.quantity) }
    : { expirationDate: '', quantity: '' };
}

function FoodStockForm({
  food,
  mode,
  onClose,
}: {
  food: MyFood;
  mode: FoodStockMode;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const copy = COPY[mode];
  const unit = food.measurementUnit.abbreviation;

  const schema = useMemo(() => createFoodStockSchema(food, mode === 'edit'), [food, mode]);
  const form = useForm<FoodStockValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: defaultsFor(food, mode),
  });

  const quantity = useWatch({ control: form.control, name: 'quantity' });
  const expirationDate = useWatch({ control: form.control, name: 'expirationDate' });
  const quantityValid = schema.shape.quantity.safeParse(quantity).success;
  const quantityChanged = Number(quantity) !== Number(food.quantity);
  const expirationChanged = expirationDate !== expirationIsoOf(food);

  const delayedQuantity = useDelayedValue(quantity, IMPACT_DELAY_MS);
  const impactQuery = useQuery({
    queryKey: ['foods', 'mine', 'impact', food.id, delayedQuantity],
    queryFn: () => getQuantityImpact(food.id, Number(delayedQuantity)),
    enabled:
      mode === 'edit' &&
      food.pendingOrders > 0 &&
      quantityValid &&
      quantityChanged &&
      delayedQuantity === quantity,
  });
  const impact = quantityValid && quantityChanged ? impactQuery.data : undefined;

  const mutation = useMutation({
    mutationFn: (values: FoodStockValues) =>
      mode === 'edit'
        ? updateFood(food.id, {
            ...(expirationChanged && { expirationDate: values.expirationDate }),
            ...(quantityChanged && { quantity: Number(values.quantity) }),
          })
        : reactivateFood(food.id, {
            expirationDate: values.expirationDate,
            quantity: Number(values.quantity),
          }),
  });

  async function refreshAfterChange() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['foods'] }),
      queryClient.invalidateQueries({ queryKey: ['food'] }),
      queryClient.invalidateQueries({ queryKey: ['orders'] }),
    ]);
  }

  async function onSubmit(values: FoodStockValues) {
    setServerError(null);
    try {
      await mutation.mutateAsync(values);
      await refreshAfterChange();
      toast.success(copy.success);
      onClose();
    } catch (error) {
      const code = apiErrorCode(error);
      if (code === 'EXPIRATION_DATE_IN_PAST') {
        form.setError('expirationDate', { message: EXPIRATION_IN_PAST_MESSAGE });
      } else if (code === 'FRACTION_NOT_ALLOWED' || code === 'PARTIAL_ONLY_QUANTITY_TOO_LOW') {
        form.setError('quantity', { message: FOOD_QUANTITY_MESSAGES[code] });
      } else {
        setServerError(myFoodErrorMessage(error));
        void refreshAfterChange();
      }
    }
  }

  const noChanges = mode === 'edit' && !quantityChanged && !expirationChanged;

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit(onSubmit)();
        }}
        noValidate
        className="flex flex-col gap-4"
      >
        {serverError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantidade ({unit})</FormLabel>
              <FormControl>
                <Input type="number" inputMode="decimal" step="0.01" min="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="expirationDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data de validade</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {impact && (impact.totalOrdersToUpdate > 0 || impact.partialOrdersToReject > 0) && (
          <Alert>
            <InfoIcon />
            <AlertDescription>
              <ul className="flex flex-col gap-1">
                {impact.totalOrdersToUpdate > 0 && (
                  <li>
                    {impact.totalOrdersToUpdate}{' '}
                    {plural(
                      impact.totalOrdersToUpdate,
                      'pedido total pendente passará',
                      'pedidos totais pendentes passarão',
                    )}{' '}
                    a pedir {Number(quantity)} {unit}.
                  </li>
                )}
                {impact.partialOrdersToReject > 0 && (
                  <li>
                    {impact.partialOrdersToReject}{' '}
                    {plural(
                      impact.partialOrdersToReject,
                      'pedido parcial pendente será rejeitado',
                      'pedidos parciais pendentes serão rejeitados',
                    )}{' '}
                    por não caber na nova quantidade.
                  </li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending || noChanges}>
            {mutation.isPending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
            {mutation.isPending ? copy.pending : copy.submit}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export function FoodStockDialog({
  food,
  mode,
  onClose,
}: {
  food: MyFood | null;
  mode: FoodStockMode;
  onClose: () => void;
}) {
  return (
    <Dialog open={food !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {COPY[mode].title}
            {food && `: ${food.name}`}
          </DialogTitle>
          <DialogDescription>{COPY[mode].description}</DialogDescription>
        </DialogHeader>
        {food && <FoodStockForm key={food.id} food={food} mode={mode} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}
