import { zodResolver } from '@hookform/resolvers/zod';
import type { LucideIcon } from 'lucide-react';
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
  AdminFormDialogShell,
  GENERIC_SAVE_ERROR,
  RequiredMark,
} from '@/features/admin/lists/admin-form-dialog';
import type { AdminFormDialogProps } from '@/features/admin/lists/admin-list-page';
import { ADMIN_LIST_ERROR_MESSAGES, type AdminListResource } from '@/features/admin/lists/list-api';
import { adminErrorCode, useAdminListSave } from '@/features/admin/lists/use-admin-list-save';

interface TextOptionConfig {
  resource: AdminListResource;
  field: 'name' | 'term';
  icon: LucideIcon;
  newTitle: string;
  editTitle: string;
  description: string;
  label: string;
  placeholder: string;
  maxLength: number;
  successNew: string;
  successEdit: string;
}

export function createTextOptionFormDialog<T extends { id: number }>(config: TextOptionConfig) {
  const schema = z.object({
    value: z.string().trim().min(1, `Informe ${config.label.toLowerCase()}.`).max(config.maxLength),
  });
  type Values = z.infer<typeof schema>;

  return function TextOptionFormDialog({ open, onOpenChange, initial }: AdminFormDialogProps<T>) {
    const [error, setError] = useState<string | null>(null);
    const save = useAdminListSave<T, Record<string, string>>(config.resource);
    const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { value: '' } });

    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
      setWasOpen(open);
      if (open) {
        form.reset({
          value: initial ? String((initial as Record<string, unknown>)[config.field]) : '',
        });
        setError(null);
      }
    }

    async function onSubmit(values: Values) {
      setError(null);
      try {
        await save.mutateAsync({ id: initial?.id, payload: { [config.field]: values.value } });
        toast.success(initial ? config.successEdit : config.successNew);
        onOpenChange(false);
      } catch (failure) {
        const code = adminErrorCode(failure);
        if (code === 'DUPLICATE_NAME') {
          form.setError('value', { message: ADMIN_LIST_ERROR_MESSAGES.DUPLICATE_NAME });
          return;
        }
        setError((code && ADMIN_LIST_ERROR_MESSAGES[code]) ?? GENERIC_SAVE_ERROR);
      }
    }

    return (
      <AdminFormDialogShell
        open={open}
        onOpenChange={onOpenChange}
        icon={config.icon}
        title={initial ? config.editTitle : config.newTitle}
        description={config.description}
        error={error}
        pending={save.isPending}
        onSubmit={() => void form.handleSubmit(onSubmit)()}
      >
        <Form {...form}>
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {config.label} <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Input placeholder={config.placeholder} maxLength={config.maxLength} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Form>
      </AdminFormDialogShell>
    );
  };
}
