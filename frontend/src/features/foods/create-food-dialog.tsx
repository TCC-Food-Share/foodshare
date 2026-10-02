import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlertIcon, ImageOffIcon, Loader2Icon } from 'lucide-react';
import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { listCategories } from '@/features/foods/categories-api';
import {
  type CreateFoodInput,
  createFoodSchema,
  DEFAULT_VALUES,
} from '@/features/foods/create-food-schema';
import { createFood } from '@/features/foods/foods-api';
import { ApiError } from '@/lib/api';

type ServerError = 'invalid' | 'network';

function bannerText(error: ServerError): string {
  return error === 'invalid'
    ? 'Há dados inválidos. Revise o formulário.'
    : 'Não foi possível cadastrar o alimento. Tente novamente em instantes.';
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
  const [previewFailed, setPreviewFailed] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
    staleTime: 10 * 60_000,
  });

  const form = useForm<CreateFoodInput>({
    resolver: zodResolver(createFoodSchema),
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
      setPreviewFailed(false);
    }
  }

  const mutation = useMutation({ mutationFn: createFood });

  async function onSubmit(values: CreateFoodInput) {
    setServerError(null);
    try {
      await mutation.mutateAsync({
        name: values.name,
        categoryId: Number(values.categoryId),
        description: values.description,
        quantity: Number(values.quantity),
        quantityUnit: values.quantityUnit,
        expirationDate: values.expirationDate,
        image: values.image,
      });
      await queryClient.invalidateQueries({ queryKey: ['foods'] });
      toast.success('Alimento cadastrado.');
      onOpenChange(false);
    } catch (error) {
      setServerError(error instanceof ApiError && error.status === 400 ? 'invalid' : 'network');
    }
  }

  const imageValue = useWatch({ control: form.control, name: 'image' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Cadastrar Alimento</DialogTitle>
          <DialogDescription>Preencha as informações do alimento para doação</DialogDescription>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{bannerText(serverError)}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()} noValidate className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do alimento</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Pães franceses" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoriesQuery.data?.map((category) => (
                          <SelectItem key={category.id} value={String(category.id)}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
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
                    <FormLabel>Quantidade disponível</FormLabel>
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
                name="quantityUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade de medida</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: unidades, kg, L..." {...field} />
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
            </div>

            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagem</FormLabel>
                  <div className="flex items-center gap-3">
                    <div className="bg-muted flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md">
                      {imageValue && !previewFailed ? (
                        <img
                          src={imageValue}
                          alt=""
                          className="size-full object-cover"
                          onError={() => setPreviewFailed(true)}
                          onLoad={() => setPreviewFailed(false)}
                        />
                      ) : (
                        <ImageOffIcon className="text-muted-foreground size-5" />
                      )}
                    </div>
                    <FormControl>
                      <Input placeholder="https://…" autoComplete="off" {...field} />
                    </FormControl>
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
                {mutation.isPending && <Loader2Icon className="animate-spin" />}
                {mutation.isPending ? 'Cadastrando…' : 'Cadastrar alimento'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
