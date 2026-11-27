import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon, CircleAlertIcon, ShieldAlertIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import {
  type AdminInstitutionKind,
  institutionPath,
  INSTITUTIONS_PATH,
  slugToKind,
} from '@/features/admin/institutions/institution-kind';
import {
  type AdminInstitutionChanges,
  type AdminInstitutionProfile,
  CANCELLATION_REASON_MESSAGES,
  DUPLICATE_FIELD_MESSAGES,
  duplicateFields,
  errorCode,
  INSTITUTIONS_QUERY_KEY,
  institutionsApi,
} from '@/features/admin/institutions/institutions-api';
import { SoftDeleteFields } from '@/features/admin/institutions/soft-delete-fields';
import type { InstitutionRole } from '@/features/auth/auth-context';
import { imageErrorMessage } from '@/features/files/image-errors';
import type { ProfileResponse } from '@/features/profile/profile-api';
import { ProfileForm } from '@/features/profile/profile-form';
import {
  mapResponseToFormValues,
  type ProfileFormInput,
  profileSchema,
} from '@/features/profile/profile-schema';
import { ApiError } from '@/lib/api';
import { PROHIBITED_CONTENT_MESSAGE, prohibitedContentFields } from '@/lib/prohibited-content';

type Situation = 'active' | 'deleted';

const ROLE: Record<AdminInstitutionKind, InstitutionRole> = {
  ESTABLISHMENT: 'establishment',
  BENEFICIARY_ENTITY: 'beneficiary',
};

const ADDRESS_FIELDS = ['postalCode', 'street', 'number', 'complement', 'city', 'state'] as const;
const PLAIN_FIELDS = [
  'tradeName',
  'name',
  'personalPhone',
  'institutionalPhone',
  'institutionalEmail',
  'description',
] as const;

function asProfileResponse(data: AdminInstitutionProfile): ProfileResponse {
  return {
    id: data.id,
    companyName: data.companyName,
    tradeName: data.tradeName,
    cnpj: data.cnpj,
    institutionalEmail: data.institutionalEmail,
    institutionalPhone: data.institutionalPhone,
    description: data.description,
    user: {
      id: data.responsible.userId,
      name: data.responsible.name,
      email: data.responsible.email,
      personalPhone: data.responsible.personalPhone ?? '',
      image: data.image,
    },
    address: { id: 0, ...data.address },
  };
}

function changedFields(
  initial: ProfileFormInput,
  values: ProfileFormInput,
): Omit<AdminInstitutionChanges, 'deleted' | 'cancellationReasonId'> {
  const changes: AdminInstitutionChanges = {};
  for (const field of PLAIN_FIELDS) {
    if (values[field] !== initial[field]) changes[field] = values[field];
  }
  if (ADDRESS_FIELDS.some((field) => (values[field] ?? '') !== (initial[field] ?? ''))) {
    changes.address = {
      postalCode: values.postalCode,
      street: values.street,
      number: values.number,
      complement: values.complement || undefined,
      city: values.city,
      state: values.state,
    };
  }
  return changes;
}

function AccountSituationCard({
  data,
  situation,
  onSituationChange,
  reasonId,
  onReasonChange,
  reasonError,
}: {
  data: AdminInstitutionProfile;
  situation: Situation;
  onSituationChange: (situation: Situation) => void;
  reasonId: string;
  onReasonChange: (reasonId: string) => void;
  reasonError: string | null;
}) {
  const deleting = situation === 'deleted' && !data.deleted;
  const restoring = situation === 'active' && data.deleted;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlertIcon className="text-muted-foreground size-4" />
          Situação da conta
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <RadioGroup
          value={situation}
          onValueChange={(value) => onSituationChange(value as Situation)}
          className="flex flex-col gap-3 sm:flex-row sm:gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="active" id="situation-active" />
            <Label htmlFor="situation-active" className="font-normal">
              Ativa
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="deleted" id="situation-deleted" />
            <Label htmlFor="situation-deleted" className="font-normal">
              Excluída logicamente
            </Label>
          </div>
        </RadioGroup>

        {deleting && (
          <SoftDeleteFields
            kind={data.kind}
            id={data.id}
            trigger="Ao salvar"
            reasonId={reasonId}
            onReasonChange={onReasonChange}
            reasonError={reasonError}
          />
        )}

        {restoring && (
          <Alert>
            <CircleAlertIcon />
            <AlertDescription>
              Ao salvar, a conta volta a entrar e a aparecer nas listagens. Os alimentos continuam
              excluídos, e os pedidos cancelados ou rejeitados pela exclusão não voltam.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function EditForm({ data }: { data: AdminInstitutionProfile }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profile = useMemo(() => asProfileResponse(data), [data]);
  const initial = useMemo(() => mapResponseToFormValues(profile), [profile]);
  const initialSituation: Situation = data.deleted ? 'deleted' : 'active';

  const [situation, setSituation] = useState<Situation>(initialSituation);
  const [reasonId, setReasonId] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ProfileFormInput>({
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
    defaultValues: initial,
  });

  const situationChanged = situation !== initialSituation;
  const unchanged = !form.formState.isDirty && !situationChanged;

  function handleError(error: unknown) {
    const duplicates = duplicateFields(error);
    if (duplicates.length > 0) {
      for (const field of duplicates) {
        if (field in DUPLICATE_FIELD_MESSAGES && field in initial) {
          form.setError(field as keyof ProfileFormInput, {
            message: DUPLICATE_FIELD_MESSAGES[field],
          });
        }
      }
      setBanner('Alguns dados já estão em uso por outro cadastro. Revise os campos destacados.');
      return;
    }
    const code = errorCode(error);
    if (code && code in CANCELLATION_REASON_MESSAGES) {
      setReasonError(CANCELLATION_REASON_MESSAGES[code]);
      return;
    }
    const prohibited = prohibitedContentFields(error);
    if (prohibited.length > 0) {
      for (const field of prohibited) {
        form.setError(field as keyof ProfileFormInput, { message: PROHIBITED_CONTENT_MESSAGE });
      }
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

  async function onSubmit(values: ProfileFormInput) {
    setBanner(null);
    setReasonError(null);
    const changes: AdminInstitutionChanges = changedFields(initial, values);
    if (situationChanged) {
      changes.deleted = situation === 'deleted';
      if (changes.deleted) {
        if (!reasonId) {
          setReasonError(CANCELLATION_REASON_MESSAGES.CANCELLATION_REASON_REQUIRED);
          return;
        }
        changes.cancellationReasonId = Number(reasonId);
      }
    }

    setSubmitting(true);
    try {
      await institutionsApi.update(data.kind, data.id, changes, values.image);
      await queryClient.invalidateQueries({ queryKey: INSTITUTIONS_QUERY_KEY });
      toast.success('Instituição atualizada.');
      void navigate(institutionPath(data.kind, data.id));
    } catch (error) {
      handleError(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {banner && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{banner}</AlertDescription>
        </Alert>
      )}
      <Form {...form}>
        <form onSubmit={(event) => event.preventDefault()} noValidate>
          <ProfileForm
            control={form.control}
            data={profile}
            role={ROLE[data.kind]}
            submitting={submitting}
            submitDisabled={unchanged}
            onCancel={() => void navigate(institutionPath(data.kind, data.id))}
            onSubmit={() => void form.handleSubmit(onSubmit)()}
          >
            <AccountSituationCard
              data={data}
              situation={situation}
              onSituationChange={(next) => {
                setSituation(next);
                setReasonError(null);
              }}
              reasonId={reasonId}
              onReasonChange={(next) => {
                setReasonId(next);
                setReasonError(null);
              }}
              reasonError={reasonError}
            />
          </ProfileForm>
        </form>
      </Form>
    </div>
  );
}

export function AdminInstitutionEditPage() {
  const { slug, id: rawId } = useParams();
  const kind = slugToKind(slug);
  const id = Number(rawId);
  const valid = kind !== null && Number.isInteger(id) && id > 0;

  const query = useQuery({
    queryKey: [...INSTITUTIONS_QUERY_KEY, 'profile', kind, id],
    queryFn: () => institutionsApi.get(kind!, id),
    enabled: valid,
  });

  if (!valid) return <Navigate to={INSTITUTIONS_PATH} replace />;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link
            to={query.data ? institutionPath(query.data.kind, query.data.id) : INSTITUTIONS_PATH}
          >
            <ArrowLeftIcon />
            Voltar ao perfil
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Editar instituição</h1>
      </div>

      {query.isLoading ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : query.isError || !query.data ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>Não foi possível carregar a instituição.</AlertDescription>
        </Alert>
      ) : (
        <EditForm key={`${query.data.kind}-${query.data.id}`} data={query.data} />
      )}
    </div>
  );
}
