import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCogIcon } from 'lucide-react';
import { useState } from 'react';
import { type FieldPath, type Resolver, useForm, useWatch } from 'react-hook-form';
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
import { UserAvatar } from '@/components/user-avatar';
import {
  type AdminAdministrator,
  ADMINISTRATOR_ERROR_MESSAGES,
  ADMINISTRATORS_QUERY_KEY,
  administratorsApi,
  type UpdateAdministratorInput,
} from '@/features/admin/administrators/administrators-api';
import {
  AdminFormDialogShell,
  GENERIC_SAVE_ERROR,
  RequiredMark,
} from '@/features/admin/lists/admin-form-dialog';
import { adminErrorCode } from '@/features/admin/lists/use-admin-list-save';
import {
  passwordConfirmationField,
  passwordField,
  PASSWORDS_MISMATCH,
  passwordsMatch,
} from '@/features/auth/password-schema';
import { useAuth } from '@/features/auth/use-auth';
import { imageErrorMessage } from '@/features/files/image-errors';
import { ImagePicker } from '@/features/files/image-picker';
import { imageFileSchema } from '@/features/files/image-rules';

interface Values {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  image: File | null;
}

const nameField = z.string().trim().min(1, 'Informe o nome.').max(200, 'Máximo de 200 caracteres.');
const emailField = z
  .string()
  .trim()
  .min(1, 'Informe o e-mail.')
  .pipe(z.email({ pattern: z.regexes.html5Email, error: 'E-mail inválido.' }).max(200));

const createSchema = z
  .object({
    name: nameField,
    email: emailField,
    password: passwordField,
    passwordConfirmation: passwordConfirmationField,
    image: imageFileSchema,
  })
  .refine(passwordsMatch, PASSWORDS_MISMATCH);

const editSchema = z.object({
  name: nameField,
  email: emailField,
  password: z.string(),
  passwordConfirmation: z.string(),
  image: imageFileSchema.nullable(),
});

const EMPTY: Values = { name: '', email: '', password: '', passwordConfirmation: '', image: null };

function changesFrom(values: Partial<Values>, initial: AdminAdministrator) {
  const changes: UpdateAdministratorInput = {};
  const name = values.name?.trim() ?? '';
  const email = values.email?.trim().toLowerCase() ?? '';
  if (name !== initial.name) changes.name = name;
  if (email !== initial.email) changes.email = email;
  return changes;
}

interface AdministratorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: AdminAdministrator | null;
}

export function AdministratorFormDialog(props: AdministratorFormDialogProps) {
  // Cadastro e edição têm schemas diferentes: um formulário por alvo.
  return <AdministratorForm key={props.initial?.id ?? 'new'} {...props} />;
}

function AdministratorForm({ open, onOpenChange, initial }: AdministratorFormDialogProps) {
  const isNew = initial === null;
  const queryClient = useQueryClient();
  const { user, refreshSession } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(isNew ? createSchema : editSchema) as Resolver<Values>,
    defaultValues: EMPTY,
    mode: 'onChange',
  });
  const watched = useWatch({ control: form.control });

  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      form.reset(initial ? { ...EMPTY, name: initial.name, email: initial.email } : EMPTY);
      setError(null);
    }
  }

  const save = useMutation({
    mutationFn: (values: Values) =>
      isNew
        ? administratorsApi.create(
            { name: values.name, email: values.email, password: values.password },
            values.image!,
          )
        : administratorsApi.update(initial.id, changesFrom(values, initial), values.image),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMINISTRATORS_QUERY_KEY }),
  });

  const unchanged =
    !isNew && !watched.image && Object.keys(changesFrom(watched, initial)).length === 0;

  async function onSubmit(values: Values) {
    setError(null);
    try {
      const saved = await save.mutateAsync(values);
      if (isNew) {
        toast.success('Administrador cadastrado.', {
          description:
            `Enviamos um código de confirmação para ${saved.email}. O acesso só é liberado ` +
            'depois da confirmação do e-mail; sem confirmação em 24 horas, o cadastro é apagado.',
          duration: 12_000,
        });
      } else {
        toast.success('Administrador atualizado.');
        if (user && user.id === String(saved.id)) await refreshSession();
      }
      onOpenChange(false);
    } catch (failure) {
      const code = adminErrorCode(failure);
      if (code === 'EMAIL_ALREADY_REGISTERED') {
        form.setError('email', { message: ADMINISTRATOR_ERROR_MESSAGES[code] });
        return;
      }
      const imageMessage = imageErrorMessage(failure);
      if (imageMessage) {
        form.setError('image', { message: imageMessage });
        return;
      }
      setError((code && ADMINISTRATOR_ERROR_MESSAGES[code]) ?? GENERIC_SAVE_ERROR);
    }
  }

  const textField = (
    name: Exclude<FieldPath<Values>, 'image'>,
    label: string,
    inputProps: React.ComponentProps<typeof Input>,
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label} <RequiredMark />
          </FormLabel>
          <FormControl>
            <Input {...inputProps} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <AdminFormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={UserCogIcon}
      title={isNew ? 'Novo administrador' : 'Editar administrador'}
      description={
        isNew
          ? 'O novo administrador recebe um código para confirmar o e-mail antes do primeiro acesso'
          : 'Altere só o que precisar; a senha não muda por aqui'
      }
      error={error}
      pending={save.isPending}
      submitDisabled={unchanged}
      onSubmit={() => void form.handleSubmit(onSubmit)()}
    >
      <Form {...form}>
        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Foto de perfil {isNew && <RequiredMark />}</FormLabel>
              <FormControl>
                <ImagePicker
                  name={field.name}
                  value={field.value}
                  onChange={(file) => {
                    form.clearErrors('image');
                    field.onChange(file);
                  }}
                  onReject={(message) => form.setError('image', { message })}
                  onBlur={field.onBlur}
                  currentUrl={initial?.image}
                  fallback={
                    initial ? (
                      <UserAvatar image={null} name={initial.name} className="size-full text-lg" />
                    ) : undefined
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {textField('name', 'Nome', { autoComplete: 'off', placeholder: 'Nome completo' })}
          {textField('email', 'E-mail', {
            type: 'email',
            autoComplete: 'off',
            placeholder: 'nome@exemplo.com',
          })}
          {isNew &&
            textField('password', 'Senha', {
              type: 'password',
              autoComplete: 'new-password',
              placeholder: 'Mínimo de 8 caracteres',
            })}
          {isNew &&
            textField('passwordConfirmation', 'Confirmar senha', {
              type: 'password',
              autoComplete: 'new-password',
              placeholder: 'Repita a senha',
            })}
        </div>
      </Form>
    </AdminFormDialogShell>
  );
}
