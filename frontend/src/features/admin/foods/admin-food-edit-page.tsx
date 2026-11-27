import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon, CircleAlertIcon, Loader2Icon, SaveIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { SearchableSelect } from '@/components/searchable-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { NotFoundFood } from '@/features/admin/foods/admin-food-detail-page';
import {
  type AdminFoodEditInput,
  changedFields,
  createAdminFoodEditSchema,
  initialValues,
} from '@/features/admin/foods/admin-food-edit-schema';
import {
  ADMIN_FOOD_ERROR_MESSAGES,
  ADMIN_FOODS_PATH,
  ADMIN_FOODS_QUERY_KEY,
  type AdminFoodChanges,
  type AdminFoodDetail,
  type AdminFoodEditImpact,
  adminFoodPath,
  adminFoodsApi,
  isEditable,
  NOT_EDITABLE_MESSAGE,
  useAdminFoodItemOptions,
  useAdminMeasurementUnitOptions,
} from '@/features/admin/foods/admin-foods-api';
import { EditImpactDialog } from '@/features/admin/foods/edit-impact-dialog';
import { imageErrorMessage } from '@/features/files/image-errors';
import { ImagePicker } from '@/features/files/image-picker';
import { FOOD_REQUEST_TYPE_LABELS, FOOD_REQUEST_TYPES } from '@/features/foods/food-request-type';
import { ApiError, errorCode } from '@/lib/api';
import { PROHIBITED_CONTENT_MESSAGE, prohibitedContentFields } from '@/lib/prohibited-content';

/** Server codes shown on the field they refer to; the others go to the banner. */
const FIELD_OF_CODE: Record<string, keyof AdminFoodEditInput> = {
  FRACTION_NOT_ALLOWED: 'quantity',
  PARTIAL_ONLY_QUANTITY_TOO_LOW: 'quantity',
  INVALID_CATALOG_ITEM: 'catalogItemId',
  INVALID_MEASUREMENT_UNIT: 'measurementUnitId',
  EXPIRATION_DATE_IN_PAST: 'expirationDate',
  PUBLISHED_AT_IN_FUTURE: 'publishedAt',
};

interface PendingSave {
  changes: AdminFoodChanges;
  image: File | null;
}

function RequiredMark() {
  return <span className="text-destructive">*</span>;
}

function EditForm({ food }: { food: AdminFoodDetail }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [impact, setImpact] = useState<AdminFoodEditImpact | null>(null);
  const [pending, setPending] = useState<PendingSave | null>(null);

  const foodItemsQuery = useAdminFoodItemOptions();
  const unitsQuery = useAdminMeasurementUnitOptions();
  const foodItems = useMemo(() => foodItemsQuery.data ?? [], [foodItemsQuery.data]);
  const units = useMemo(() => unitsQuery.data ?? [], [unitsQuery.data]);
  const schema = useMemo(() => createAdminFoodEditSchema(food, units), [food, units]);
  const initial = useMemo(() => initialValues(food), [food]);

  const form = useForm<AdminFoodEditInput>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: initial,
  });

  const foodOptions = useMemo(
    () =>
      foodItems.map((item) => ({
        value: String(item.id),
        label: item.name,
        keywords: [item.category.name],
      })),
    [foodItems],
  );
  const unitOptions = useMemo(
    () =>
      units.map((unit) => ({
        value: String(unit.id),
        label: `${unit.name} (${unit.abbreviation})`,
        keywords: [unit.abbreviation],
      })),
    [units],
  );

  const catalogItemId = useWatch({ control: form.control, name: 'catalogItemId' });
  const category =
    foodItems.find((item) => String(item.id) === catalogItemId)?.category.name ??
    (catalogItemId === initial.catalogItemId ? food.category.name : '');

  function handleError(error: unknown) {
    const prohibited = prohibitedContentFields(error).filter(
      (field) => field === 'description' || field === 'notes',
    );
    if (prohibited.length > 0) {
      for (const field of prohibited) form.setError(field, { message: PROHIBITED_CONTENT_MESSAGE });
      return;
    }
    const code = errorCode(error);
    if (code && code in FIELD_OF_CODE) {
      form.setError(FIELD_OF_CODE[code], { message: ADMIN_FOOD_ERROR_MESSAGES[code] });
      return;
    }
    if (code && code in ADMIN_FOOD_ERROR_MESSAGES) {
      setBanner(ADMIN_FOOD_ERROR_MESSAGES[code]);
      return;
    }
    const imageMessage = imageErrorMessage(error);
    if (imageMessage) {
      form.setError('image', { message: imageMessage });
      return;
    }
    if (error instanceof ApiError && error.status === 400) {
      setBanner('Há dados inválidos. Revise o formulário.');
      return;
    }
    toast.error('Não foi possível salvar. Tente novamente em instantes.');
  }

  async function save({ changes, image }: PendingSave) {
    setSaving(true);
    try {
      await adminFoodsApi.update(food.id, changes, image);
      await queryClient.invalidateQueries({ queryKey: ADMIN_FOODS_QUERY_KEY });
      toast.success('Alimento atualizado.');
      void navigate(adminFoodPath(food.id));
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
      setImpact(null);
      setPending(null);
    }
  }

  async function onSubmit(values: AdminFoodEditInput) {
    setBanner(null);
    const next: PendingSave = { changes: changedFields(initial, values), image: values.image };
    const { catalogItemId, measurementUnitId, requestType, quantity } = next.changes;
    const affectsOrders = [catalogItemId, measurementUnitId, requestType, quantity].some(
      (value) => value !== undefined,
    );

    if (affectsOrders) {
      setSaving(true);
      let preview: AdminFoodEditImpact;
      try {
        preview = await adminFoodsApi.editImpact(food.id, {
          catalogItemId,
          measurementUnitId,
          requestType,
          quantity,
        });
      } catch (error) {
        setSaving(false);
        handleError(error);
        return;
      }
      setSaving(false);
      if (preview.ordersToReject + preview.ordersToUpdate > 0) {
        setPending(next);
        setImpact(preview);
        return;
      }
    }
    await save(next);
  }

  const revalidateQuantity = () => {
    if (form.getValues('quantity')) void form.trigger('quantity');
  };

  return (
    <Form {...form}>
      <form onSubmit={(event) => event.preventDefault()} noValidate className="flex flex-col gap-6">
        {banner && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{banner}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="flex flex-col gap-5">
            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Foto do alimento</FormLabel>
                  <FormControl>
                    <ImagePicker
                      variant="dropzone"
                      name={field.name}
                      value={field.value}
                      currentUrl={food.image}
                      onChange={(file) => {
                        form.clearErrors('image');
                        field.onChange(file);
                      }}
                      onReject={(message) => form.setError('image', { message })}
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
                  value={category}
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
                    <Textarea maxLength={2000} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Quantidade <RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="measurementUnitId"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>
                      Unidade de medida <RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={unitOptions}
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value);
                          field.onBlur();
                          revalidateQuantity();
                        }}
                        placeholder={unitsQuery.isLoading ? 'Carregando…' : 'Selecione a unidade'}
                        searchPlaceholder="Buscar unidade…"
                        emptyMessage="Nenhuma unidade encontrada."
                        disabled={unitsQuery.isLoading}
                        invalid={Boolean(fieldState.error)}
                      />
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
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        revalidateQuantity();
                      }}
                    >
                      <SelectTrigger className="w-full" aria-label="Tipo de solicitação aceita">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FOOD_REQUEST_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {FOOD_REQUEST_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="expirationDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Data de vencimento <RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="publishedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Data de publicação <RequiredMark />
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea maxLength={2000} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => void navigate(adminFoodPath(food.id))}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={saving || !form.formState.isDirty}
            onClick={() => void form.handleSubmit(onSubmit)()}
          >
            {saving ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
            Salvar alterações
          </Button>
        </div>
      </form>

      <EditImpactDialog
        impact={impact}
        saving={saving}
        onConfirm={() => pending && void save(pending)}
        onClose={() => {
          setImpact(null);
          setPending(null);
        }}
      />
    </Form>
  );
}

/** RF50, DT57: the edit form of the panel. */
export function AdminFoodEditPage() {
  const id = Number(useParams().id);
  const valid = Number.isInteger(id) && id > 0;

  const query = useQuery({
    queryKey: [...ADMIN_FOODS_QUERY_KEY, 'detail', id],
    queryFn: () => adminFoodsApi.get(id),
    enabled: valid,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });

  if (!valid) return <Navigate to={ADMIN_FOODS_PATH} replace />;
  if (query.error instanceof ApiError && query.error.status === 404) return <NotFoundFood />;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link to={adminFoodPath(id)}>
            <ArrowLeftIcon />
            Voltar ao alimento
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Editar alimento</h1>
        {query.data && (
          <p className="text-muted-foreground text-sm">
            {query.data.name}, de {query.data.establishment.publicName}
          </p>
        )}
      </div>

      {query.isLoading ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : query.isError || !query.data ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>Não foi possível carregar o alimento.</AlertDescription>
        </Alert>
      ) : !isEditable(query.data) ? (
        <div className="flex flex-col items-start gap-4">
          <Alert>
            <CircleAlertIcon />
            <AlertDescription>{NOT_EDITABLE_MESSAGE}</AlertDescription>
          </Alert>
          <Button asChild variant="outline">
            <Link to={adminFoodPath(id)}>Ver o alimento</Link>
          </Button>
        </div>
      ) : (
        <EditForm key={query.data.id} food={query.data} />
      )}
    </div>
  );
}
