import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleAlertIcon, Loader2Icon, PackagePlusIcon, SaveIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { SearchableSelect } from '@/components/searchable-select';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useFoodItems, useMeasurementUnits } from '@/features/catalog/catalog-api';
import { imageErrorMessage } from '@/features/files/image-errors';
import { ImagePicker } from '@/features/files/image-picker';
import {
  type CreateFoodInput,
  createFoodSchema,
  DEFAULT_VALUES,
  FOOD_IMAGE_REQUIRED,
} from '@/features/foods/create-food-schema';
import { FOOD_QUANTITY_MESSAGES } from '@/features/foods/food-quantity';
import {
  FOOD_REQUEST_TYPE_DESCRIPTIONS,
  FOOD_REQUEST_TYPE_LABELS,
  FOOD_REQUEST_TYPES,
  type FoodRequestType,
} from '@/features/foods/food-request-type';
import { createFood } from '@/features/foods/foods-api';
import { ApiError } from '@/lib/api';

type ServerError = 'invalid' | 'network';

function bannerText(error: ServerError): string {
  return error === 'invalid'
    ? 'Há dados inválidos. Revise o formulário.'
    : 'Não foi possível cadastrar o alimento. Tente novamente em instantes.';
}

function errorCode(error: unknown): string | undefined {
  if (!(error instanceof ApiError) || error.status !== 400) return undefined;
  const body = error.body;
  return body && typeof body === 'object' && 'code' in body && typeof body.code === 'string'
    ? body.code
    : undefined;
}

function RequiredMark() {
  return <span className="text-destructive">*</span>;
}

function RequestTypeCard({ value }: { value: FoodRequestType }) {
  const id = `request-type-${value}`;
  return (
    <label
      htmlFor={id}
      className="group border-border bg-background has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary has-[[data-state=checked]]:text-primary-foreground has-focus-visible:ring-ring/50 flex cursor-pointer flex-col gap-2 rounded-lg border p-3.5 transition-colors has-focus-visible:ring-[3px]"
    >
      <span className="flex items-center gap-2">
        <RadioGroupItem id={id} value={value} className="bg-white dark:bg-white" />
        <span className="text-[13px] font-semibold">{FOOD_REQUEST_TYPE_LABELS[value]}</span>
      </span>
      <span className="text-muted-foreground group-has-[[data-state=checked]]:text-primary-foreground/80 text-xs">
        {FOOD_REQUEST_TYPE_DESCRIPTIONS[value]}
      </span>
    </label>
  );
}

export function CreateFoodDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<ServerError | null>(null);

  const foodItemsQuery = useFoodItems();
  const unitsQuery = useMeasurementUnits();
  const foodItems = useMemo(() => foodItemsQuery.data ?? [], [foodItemsQuery.data]);
  const units = useMemo(() => unitsQuery.data ?? [], [unitsQuery.data]);
  const schema = useMemo(() => createFoodSchema(units), [units]);

  const form = useForm<CreateFoodInput>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
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
    }
  }

  const foodOptions = useMemo(
    () =>
      foodItems.map((item) => ({
        value: String(item.id),
        label: item.name,
        keywords: [item.category.name],
      })),
    [foodItems],
  );

  const catalogItemId = useWatch({ control: form.control, name: 'catalogItemId' });
  const selectedItem = foodItems.find((item) => String(item.id) === catalogItemId);

  const mutation = useMutation({
    mutationFn: ({ values, image }: { values: CreateFoodInput; image: File }) =>
      createFood(
        {
          catalogItemId: Number(values.catalogItemId),
          description: values.description.trim(),
          quantity: Number(values.quantity),
          measurementUnitId: Number(values.measurementUnitId),
          requestType: values.requestType,
          expirationDate: values.expirationDate,
          notes: values.notes.trim() || undefined,
        },
        image,
      ),
  });

  function handleServerError(error: unknown) {
    const code = errorCode(error);
    if (code === 'FRACTION_NOT_ALLOWED' || code === 'PARTIAL_ONLY_QUANTITY_TOO_LOW') {
      form.setError('quantity', { message: FOOD_QUANTITY_MESSAGES[code] });
      return;
    }
    if (code === 'INVALID_CATALOG_ITEM') {
      form.setError('catalogItemId', { message: 'Selecione um alimento da lista.' });
      return;
    }
    if (code === 'INVALID_MEASUREMENT_UNIT') {
      form.setError('measurementUnitId', { message: 'Selecione uma unidade da lista.' });
      return;
    }
    if (code === 'IMAGE_REQUIRED') {
      form.setError('image', { message: FOOD_IMAGE_REQUIRED });
      return;
    }
    const imageMessage = imageErrorMessage(error);
    if (imageMessage) {
      form.setError('image', { message: imageMessage });
      return;
    }
    setServerError(error instanceof ApiError && error.status === 400 ? 'invalid' : 'network');
  }

  async function onSubmit(values: CreateFoodInput) {
    setServerError(null);
    try {
      await mutation.mutateAsync({ values, image: values.image });
      await queryClient.invalidateQueries({ queryKey: ['foods'] });
      toast.success('Alimento cadastrado.');
      onOpenChange(false);
    } catch (error) {
      handleServerError(error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-5">
          <div className="flex items-center gap-3 pr-8">
            <div className="bg-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
              <PackagePlusIcon className="text-primary-foreground size-[18px]" />
            </div>
            <div className="flex flex-col gap-0.5 text-left">
              <DialogTitle>Cadastrar Alimento</DialogTitle>
              <DialogDescription>Preencha as informações do alimento para doação</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => e.preventDefault()}
            noValidate
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
              {serverError && (
                <Alert variant="destructive">
                  <CircleAlertIcon />
                  <AlertDescription>{bannerText(serverError)}</AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Foto do alimento <RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <ImagePicker
                        variant="dropzone"
                        name={field.name}
                        value={field.value}
                        onChange={(file) => {
                          form.clearErrors('image');
                          field.onChange(file);
                        }}
                        onReject={(message) => form.setError('image', { message })}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="catalogItemId"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>
                        Nome do alimento <RequiredMark />
                      </FormLabel>
                      <FormControl>
                        <SearchableSelect
                          options={foodOptions}
                          value={field.value}
                          onChange={(value) => {
                            field.onChange(value);
                            field.onBlur();
                          }}
                          placeholder={
                            foodItemsQuery.isLoading ? 'Carregando…' : 'Selecione o alimento'
                          }
                          searchPlaceholder="Buscar alimento…"
                          emptyMessage="Nenhum alimento encontrado."
                          disabled={foodItemsQuery.isLoading}
                          invalid={Boolean(fieldState.error)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Input
                    value={selectedItem?.category.name ?? ''}
                    placeholder="Definida pelo alimento"
                    readOnly
                    tabIndex={-1}
                    className="bg-muted"
                  />
                </FormItem>
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Descrição <RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o alimento, estado de conservação, informações relevantes..."
                        maxLength={2000}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Quantidade disponível <RequiredMark />
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          placeholder="Ex: 50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="measurementUnitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Unidade de medida <RequiredMark />
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (form.getValues('quantity')) void form.trigger('quantity');
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Ex: unidades, kg, L..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {units.map((unit) => (
                            <SelectItem key={unit.id} value={String(unit.id)}>
                              {unit.name} ({unit.abbreviation})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expirationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Data de validade <RequiredMark />
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="requestType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Tipo de solicitação aceita <RequiredMark />
                    </FormLabel>
                    <FormDescription className="text-xs">
                      Define se entidades beneficiárias podem solicitar o alimento inteiro, apenas
                      uma parte, ou as duas opções.
                    </FormDescription>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (form.getValues('quantity')) void form.trigger('quantity');
                        }}
                        className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
                      >
                        {FOOD_REQUEST_TYPES.map((type) => (
                          <RequestTypeCard key={type} value={type} />
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informações adicionais, restrições, horário preferencial de retirada..."
                        maxLength={2000}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="border-t px-6 py-4">
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
                {mutation.isPending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
                {mutation.isPending ? 'Cadastrando…' : 'Cadastrar alimento'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
