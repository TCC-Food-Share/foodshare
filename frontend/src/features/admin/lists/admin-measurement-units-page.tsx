import { zodResolver } from '@hookform/resolvers/zod';
import { RulerIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

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
import { type AdminFormDialogProps, AdminListPage } from '@/features/admin/lists/admin-list-page';
import {
  ADMIN_LIST_ERROR_MESSAGES,
  type AdminMeasurementUnit,
} from '@/features/admin/lists/list-api';
import { adminErrorCode, useAdminListSave } from '@/features/admin/lists/use-admin-list-save';
import { formatAdminId } from '@/lib/format';

const schema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da unidade.').max(50),
  abbreviation: z.string().trim().min(1, 'Informe a sigla.').max(10),
  allowsFraction: z.enum(['yes', 'no']),
});
type Values = z.infer<typeof schema>;

interface UnitPayload {
  name: string;
  abbreviation: string;
  allowsFraction: boolean;
}

function MeasurementUnitFormDialog({
  open,
  onOpenChange,
  initial,
}: AdminFormDialogProps<AdminMeasurementUnit>) {
  const [error, setError] = useState<string | null>(null);
  const save = useAdminListSave<AdminMeasurementUnit, UnitPayload>('measurement-units');
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', abbreviation: '', allowsFraction: 'no' },
  });

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      form.reset({
        name: initial?.name ?? '',
        abbreviation: initial?.abbreviation ?? '',
        allowsFraction: initial?.allowsFraction ? 'yes' : 'no',
      });
      setError(null);
    }
  }

  async function onSubmit(values: Values) {
    setError(null);
    try {
      await save.mutateAsync({
        id: initial?.id,
        payload: {
          name: values.name,
          abbreviation: values.abbreviation,
          allowsFraction: values.allowsFraction === 'yes',
        },
      });
      toast.success(initial ? 'Unidade atualizada.' : 'Unidade cadastrada.');
      onOpenChange(false);
    } catch (failure) {
      const code = adminErrorCode(failure);
      if (code === 'DUPLICATE_NAME') {
        form.setError('name', { message: ADMIN_LIST_ERROR_MESSAGES.DUPLICATE_NAME });
        return;
      }
      if (code === 'DUPLICATE_ABBREVIATION') {
        form.setError('abbreviation', {
          message: ADMIN_LIST_ERROR_MESSAGES.DUPLICATE_ABBREVIATION,
        });
        return;
      }
      if (code === 'FRACTION_IN_USE') {
        form.setError('allowsFraction', { message: ADMIN_LIST_ERROR_MESSAGES.FRACTION_IN_USE });
        return;
      }
      setError((code && ADMIN_LIST_ERROR_MESSAGES[code]) ?? GENERIC_SAVE_ERROR);
    }
  }

  return (
    <AdminFormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={RulerIcon}
      title={initial ? 'Editar unidade de medida' : 'Nova unidade de medida'}
      description="Unidades em que os estabelecimentos informam a quantidade dos alimentos"
      error={error}
      pending={save.isPending}
      onSubmit={() => void form.handleSubmit(onSubmit)()}
    >
      <Form {...form}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem]">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Nome <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Bandeja" maxLength={50} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
        </div>
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
      </Form>
    </AdminFormDialogShell>
  );
}

export function AdminMeasurementUnitsPage() {
  return (
    <AdminListPage<AdminMeasurementUnit>
      resource="measurement-units"
      title="Unidades de Medida"
      description="Unidades disponíveis para informar a quantidade dos alimentos"
      newLabel="Nova unidade"
      itemLabel="unidades"
      searchPlaceholder="Buscar por ID, nome ou sigla..."
      rowLabel={(row) => row.name}
      inUseMessage="Há alimentos cadastrados com esta unidade."
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
        { key: 'name', header: 'Nome', sortable: true, render: (row) => row.name },
        {
          key: 'abbreviation',
          header: 'Sigla',
          sortable: true,
          className: 'w-28',
          render: (row) => row.abbreviation,
        },
        {
          key: 'allowsFraction',
          header: 'Fracionada',
          sortable: true,
          className: 'w-32',
          render: (row) => (row.allowsFraction ? 'Sim' : 'Não'),
        },
        {
          key: 'usageCount',
          header: 'Alimentos',
          sortable: true,
          className: 'w-28',
          render: (row) => row.usageCount,
        },
      ]}
      FormDialog={MeasurementUnitFormDialog}
    />
  );
}
