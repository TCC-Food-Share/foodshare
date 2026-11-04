import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { LightbulbIcon } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AdminFormDialogShell,
  GENERIC_SAVE_ERROR,
  RequiredMark,
} from '@/features/admin/lists/admin-form-dialog';
import {
  ADMIN_LIST_ERROR_MESSAGES,
  type AdminCategory,
  adminListApi,
} from '@/features/admin/lists/list-api';
import { adminErrorCode } from '@/features/admin/lists/use-admin-list-save';
import {
  type AdminSuggestion,
  ALREADY_REVIEWED_MESSAGE,
  approveSuggestion,
  type ApproveSuggestionPayload,
  useSuggestionsInvalidate,
} from '@/features/admin/suggestions/admin-suggestions-api';
import {
  SUGGESTION_TYPE_LABELS,
  type SuggestionType,
} from '@/features/suggestions/suggestion-labels';

const TEXT_LIMITS: Record<SuggestionType, number> = {
  CATEGORY: 100,
  FOOD_CATALOG_ITEM: 200,
  MEASUREMENT_UNIT: 50,
  CANCELLATION_REASON: 200,
};

function createSchema(type: SuggestionType) {
  const limit = TEXT_LIMITS[type];
  return z
    .object({
      text: z
        .string()
        .trim()
        .min(1, 'Informe o texto da nova opção.')
        .max(limit, `Use no máximo ${limit} caracteres.`),
      categoryId: z.string(),
      abbreviation: z.string().trim().max(10, 'Use no máximo 10 caracteres.'),
      allowsFraction: z.enum(['yes', 'no']),
    })
    .superRefine((values, context) => {
      if (type === 'FOOD_CATALOG_ITEM' && !values.categoryId) {
        context.addIssue({
          code: 'custom',
          path: ['categoryId'],
          message: 'Selecione a categoria.',
        });
      }
      if (type === 'MEASUREMENT_UNIT' && !values.abbreviation) {
        context.addIssue({ code: 'custom', path: ['abbreviation'], message: 'Informe a sigla.' });
      }
    });
}
type Values = z.infer<ReturnType<typeof createSchema>>;

function toPayload(type: SuggestionType, values: Values): ApproveSuggestionPayload {
  if (type === 'FOOD_CATALOG_ITEM') {
    return { text: values.text, categoryId: Number(values.categoryId) };
  }
  if (type === 'MEASUREMENT_UNIT') {
    return {
      text: values.text,
      abbreviation: values.abbreviation,
      allowsFraction: values.allowsFraction === 'yes',
    };
  }
  return { text: values.text };
}

interface ApproveSuggestionDialogProps {
  suggestion: AdminSuggestion;
  onClose: () => void;
}

export function ApproveSuggestionDialog({ suggestion, onClose }: ApproveSuggestionDialogProps) {
  const { type } = suggestion;
  const [error, setError] = useState<string | null>(null);
  const schema = useMemo(() => createSchema(type), [type]);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      text: suggestion.text,
      categoryId: '',
      abbreviation: '',
      allowsFraction: 'no',
    },
  });
  const invalidate = useSuggestionsInvalidate();
  const mutation = useMutation({
    mutationFn: (payload: ApproveSuggestionPayload) => approveSuggestion(suggestion.id, payload),
  });

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'categories', 'options'],
    queryFn: () =>
      adminListApi<AdminCategory, unknown>('categories').list({ pageSize: 100, sort: 'name' }),
    enabled: type === 'FOOD_CATALOG_ITEM',
  });
  const categoryOptions = useMemo(
    () =>
      (categoriesQuery.data?.data ?? []).map((category) => ({
        value: String(category.id),
        label: category.name,
      })),
    [categoriesQuery.data],
  );

  async function onSubmit(values: Values) {
    setError(null);
    try {
      await mutation.mutateAsync(toPayload(type, values));
      toast.success('Sugestão aprovada. A opção já está na lista.');
      await invalidate();
      onClose();
    } catch (failure) {
      const code = adminErrorCode(failure);
      if (code === 'SUGGESTION_ALREADY_REVIEWED') {
        toast.error(ALREADY_REVIEWED_MESSAGE);
        await invalidate();
        onClose();
        return;
      }
      if (code === 'DUPLICATE_NAME') {
        form.setError('text', { message: ADMIN_LIST_ERROR_MESSAGES.DUPLICATE_NAME });
        return;
      }
      if (code === 'DUPLICATE_ABBREVIATION') {
        form.setError('abbreviation', {
          message: ADMIN_LIST_ERROR_MESSAGES.DUPLICATE_ABBREVIATION,
        });
        return;
      }
      setError(GENERIC_SAVE_ERROR);
    }
  }

  return (
    <AdminFormDialogShell
      open
      onOpenChange={(open) => !open && onClose()}
      icon={LightbulbIcon}
      title="Aprovar sugestão"
      description={`Cadastra a opção em: ${SUGGESTION_TYPE_LABELS[type]}`}
      error={error}
      pending={mutation.isPending}
      onSubmit={() => void form.handleSubmit(onSubmit)()}
    >
      <Form {...form}>
        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Texto da opção <RequiredMark />
              </FormLabel>
              <FormControl>
                <Input maxLength={TEXT_LIMITS[type]} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {type === 'FOOD_CATALOG_ITEM' && (
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
                    placeholder={
                      categoriesQuery.isLoading ? 'Carregando…' : 'Selecione a categoria'
                    }
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
        )}
        {type === 'MEASUREMENT_UNIT' && (
          <>
            <FormField
              control={form.control}
              name="abbreviation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Sigla <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: bdj" maxLength={10} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allowsFraction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Aceita quantidade fracionada <RequiredMark />
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="yes">Sim (até 2 casas decimais)</SelectItem>
                      <SelectItem value="no">Não (só números inteiros)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </Form>
    </AdminFormDialogShell>
  );
}
