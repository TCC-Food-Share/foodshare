import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { BookOpenIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { SearchableSelect } from '@/components/searchable-select';
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
  AdminFormDialogShell,
  GENERIC_SAVE_ERROR,
  RequiredMark,
} from '@/features/admin/lists/admin-form-dialog';
import { type AdminFormDialogProps, AdminListPage } from '@/features/admin/lists/admin-list-page';
import {
  ADMIN_LIST_ERROR_MESSAGES,
  type AdminCategory,
  type AdminFoodItem,
  adminListApi,
} from '@/features/admin/lists/list-api';
import { adminErrorCode, useAdminListSave } from '@/features/admin/lists/use-admin-list-save';
import { formatAdminId } from '@/lib/format';

const schema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do alimento.').max(200),
  categoryId: z.string().min(1, 'Selecione a categoria.'),
});
type Values = z.infer<typeof schema>;

function FoodItemFormDialog({ open, onOpenChange, initial }: AdminFormDialogProps<AdminFoodItem>) {
  const [error, setError] = useState<string | null>(null);
  const save = useAdminListSave<AdminFoodItem, { name: string; categoryId: number }>('food-items');
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', categoryId: '' },
  });

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'categories', 'options'],
    queryFn: () =>
      adminListApi<AdminCategory, unknown>('categories').list({ pageSize: 100, sort: 'name' }),
    enabled: open,
  });
  const categoryOptions = useMemo(
    () =>
      (categoriesQuery.data?.data ?? []).map((category) => ({
        value: String(category.id),
        label: category.name,
      })),
    [categoriesQuery.data],
  );

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      form.reset({
        name: initial?.name ?? '',
        categoryId: initial ? String(initial.category.id) : '',
      });
      setError(null);
    }
  }

  async function onSubmit(values: Values) {
    setError(null);
    try {
      await save.mutateAsync({
        id: initial?.id,
        payload: { name: values.name, categoryId: Number(values.categoryId) },
      });
      toast.success(initial ? 'Item atualizado.' : 'Item cadastrado.');
      onOpenChange(false);
    } catch (failure) {
      const code = adminErrorCode(failure);
      if (code === 'DUPLICATE_NAME') {
        form.setError('name', { message: ADMIN_LIST_ERROR_MESSAGES.DUPLICATE_NAME });
        return;
      }
      setError((code && ADMIN_LIST_ERROR_MESSAGES[code]) ?? GENERIC_SAVE_ERROR);
    }
  }

  return (
    <AdminFormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={BookOpenIcon}
      title={initial ? 'Editar item do catálogo' : 'Novo item do catálogo'}
      description="A categoria do item define a categoria dos alimentos cadastrados com ele"
      error={error}
      pending={save.isPending}
      onSubmit={() => void form.handleSubmit(onSubmit)()}
    >
      <Form {...form}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Nome do alimento <RequiredMark />
              </FormLabel>
              <FormControl>
                <Input placeholder="Ex: Pão integral" maxLength={200} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>
                Categoria <RequiredMark />
              </FormLabel>
              <FormControl>
                <SearchableSelect
                  options={categoryOptions}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    field.onBlur();
                  }}
                  placeholder={categoriesQuery.isLoading ? 'Carregando…' : 'Selecione a categoria'}
                  searchPlaceholder="Buscar categoria…"
                  emptyMessage="Nenhuma categoria encontrada."
                  disabled={categoriesQuery.isLoading}
                  invalid={Boolean(fieldState.error)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </Form>
    </AdminFormDialogShell>
  );
}

export function AdminFoodItemsPage() {
  return (
    <AdminListPage<AdminFoodItem>
      resource="food-items"
      title="Catálogo de Alimentos"
      description="Alimentos que os estabelecimentos escolhem ao cadastrar uma doação"
      newLabel="Novo item"
      itemLabel="itens"
      searchPlaceholder="Buscar por ID, nome ou categoria..."
      rowLabel={(row) => row.name}
      inUseMessage="Há alimentos cadastrados com este item."
      columns={[
        {
          key: 'id',
          header: 'ID',
          sortable: true,
          className: 'w-20',
          render: (row) => (
            <span className="text-muted-foreground text-xs font-normal">
              {formatAdminId(row.id)}
            </span>
          ),
        },
        { key: 'name', header: 'Alimento', sortable: true, render: (row) => row.name },
        {
          key: 'category',
          header: 'Categoria',
          sortable: true,
          render: (row) => row.category.name,
        },
        {
          key: 'usageCount',
          header: 'Alimentos',
          sortable: true,
          className: 'w-32',
          render: (row) => row.usageCount,
        },
      ]}
      FormDialog={FoodItemFormDialog}
    />
  );
}
