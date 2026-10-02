import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlertIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/use-auth';
import {
  getMyProfile,
  updateMyProfile,
  type UpdateProfilePayload,
} from '@/features/profile/profile-api';
import { ProfileForm } from '@/features/profile/profile-form';
import {
  mapResponseToFormValues,
  type ProfileFormInput,
  profileSchema,
} from '@/features/profile/profile-schema';
import { ProfileView } from '@/features/profile/profile-view';
import { ApiError } from '@/lib/api';

const FIELD_MESSAGES: Record<string, string> = {
  institutionalEmail: 'Este e-mail institucional já está em uso por outro cadastro.',
  institutionalPhone: 'Este celular institucional já está em uso por outro cadastro.',
  personal: 'Este celular pessoal já está em uso por outro cadastro.',
};

// The backend's `personal` field only ever means `personalPhone` here — the
// other personal field (e-mail) is locked (RF06) and never sent in the PATCH.
const FIELD_KEY: Record<string, keyof ProfileFormInput> = {
  institutionalEmail: 'institutionalEmail',
  institutionalPhone: 'institutionalPhone',
  personal: 'personalPhone',
};

type ServerError = { kind: 'dup' } | { kind: 'invalid' } | { kind: 'network' };

function bannerText(error: ServerError): string {
  switch (error.kind) {
    case 'dup':
      return 'Alguns dados já estão em uso por outro cadastro. Revise os campos destacados.';
    case 'invalid':
      return 'Há dados inválidos. Revise o formulário.';
    case 'network':
      return 'Não foi possível salvar. Tente novamente em instantes.';
  }
}

function extractFields(body: unknown): string[] {
  if (body && typeof body === 'object' && 'fields' in body) {
    const fields = body.fields;
    if (Array.isArray(fields)) return fields.filter((v): v is string => typeof v === 'string');
  }
  return [];
}

export function ProfilePage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [serverError, setServerError] = useState<ServerError | null>(null);

  const queryKey = ['profile', role] as const;
  const query = useQuery({
    queryKey,
    queryFn: () => getMyProfile(role!),
    enabled: role !== null,
  });

  const form = useForm<ProfileFormInput>({
    resolver: zodResolver(profileSchema),
    mode: 'onTouched',
    defaultValues: {
      personalPhone: '',
      institutionalPhone: '',
      institutionalEmail: '',
      image: '',
      description: '',
      postalCode: '',
      street: '',
      number: '',
      complement: '',
      city: '',
      state: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateMyProfile(role!, payload),
  });

  function startEdit() {
    if (!query.data) return;
    form.reset(mapResponseToFormValues(query.data));
    setServerError(null);
    setMode('edit');
  }

  function cancelEdit() {
    if (query.data) form.reset(mapResponseToFormValues(query.data));
    setServerError(null);
    setMode('view');
  }

  async function onSubmit(values: ProfileFormInput) {
    setServerError(null);
    const payload: UpdateProfilePayload = {
      personalPhone: values.personalPhone,
      institutionalPhone: values.institutionalPhone,
      institutionalEmail: values.institutionalEmail,
      image: values.image || undefined,
      description: values.description,
      address: {
        postalCode: values.postalCode,
        street: values.street,
        number: values.number,
        complement: values.complement || undefined,
        city: values.city,
        state: values.state,
      },
    };

    try {
      const updated = await mutation.mutateAsync(payload);
      queryClient.setQueryData(queryKey, updated);
      toast.success('Perfil atualizado.');
      setMode('view');
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const fields = extractFields(error.body);
        for (const fieldName of fields) {
          const key = FIELD_KEY[fieldName];
          if (key) form.setError(key, { message: FIELD_MESSAGES[fieldName] });
        }
        setServerError({ kind: 'dup' });
        return;
      }
      if (error instanceof ApiError && error.status === 400) {
        setServerError({ kind: 'invalid' });
        return;
      }
      setServerError({ kind: 'network' });
    }
  }

  if (role === null) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertDescription>Não foi possível determinar o tipo da sua conta.</AlertDescription>
      </Alert>
    );
  }

  if (query.isLoading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertDescription>
          Não foi possível carregar seu perfil. Tente novamente mais tarde.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {serverError && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{bannerText(serverError)}</AlertDescription>
        </Alert>
      )}

      {mode === 'view' ? (
        <ProfileView data={query.data} role={role} onEdit={startEdit} />
      ) : (
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()} noValidate>
            <ProfileForm
              control={form.control}
              data={query.data}
              role={role}
              submitting={mutation.isPending}
              onCancel={cancelEdit}
              onSubmit={() => void form.handleSubmit(onSubmit)()}
            />
          </form>
        </Form>
      )}
    </div>
  );
}
