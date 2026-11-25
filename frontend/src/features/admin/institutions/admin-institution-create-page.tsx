import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon, CircleAlertIcon, Loader2Icon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  type AdminInstitutionKind,
  INSTITUTION_KIND_LABELS,
  INSTITUTION_KINDS,
  institutionPath,
  INSTITUTIONS_PATH,
} from '@/features/admin/institutions/institution-kind';
import {
  DUPLICATE_FIELD_MESSAGES,
  duplicateFields,
  INSTITUTIONS_QUERY_KEY,
  institutionsApi,
} from '@/features/admin/institutions/institutions-api';
import { AddressStep } from '@/features/auth/sign-up/address-step';
import { InstitutionalStep } from '@/features/auth/sign-up/institutional-step';
import { ProfilePhotoStep } from '@/features/auth/sign-up/profile-photo-step';
import { ResponsibleStep } from '@/features/auth/sign-up/responsible-step';
import { toSignUpPayload } from '@/features/auth/sign-up/sign-up-api';
import { type SignUpInput, signUpSchema } from '@/features/auth/sign-up/sign-up-schema';
import { imageErrorMessage } from '@/features/files/image-errors';
import { ApiError } from '@/lib/api';
import { PROHIBITED_CONTENT_MESSAGE, prohibitedContentFields } from '@/lib/prohibited-content';

// The shared sign-up schema names the kind with the public wizard's values.
const PROFILE_TYPE: Record<AdminInstitutionKind, SignUpInput['profileType']> = {
  ESTABLISHMENT: 'establishment',
  BENEFICIARY_ENTITY: 'beneficiary',
};

const kindOf = (profileType: SignUpInput['profileType']): AdminInstitutionKind =>
  profileType === 'establishment' ? 'ESTABLISHMENT' : 'BENEFICIARY_ENTITY';

const CREATED_MESSAGE =
  'Instituição cadastrada. O responsável recebeu um código no e-mail pessoal e só entra depois ' +
  'de confirmar. Sem confirmação em 24 horas, o cadastro é apagado.';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">{children}</CardContent>
    </Card>
  );
}

export function AdminInstitutionCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [banner, setBanner] = useState<string | null>(null);

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    mode: 'onChange',
    defaultValues: {
      profileType: undefined,
      companyName: '',
      tradeName: '',
      cnpj: '',
      institutionalEmail: '',
      institutionalPhone: '',
      description: '',
      name: '',
      email: '',
      personalPhone: '',
      password: '',
      passwordConfirmation: '',
      postalCode: '',
      street: '',
      number: '',
      complement: '',
      city: '',
      state: '',
    },
  });

  const submitting = form.formState.isSubmitting;

  function handleError(error: unknown) {
    const duplicates = duplicateFields(error);
    if (duplicates.length > 0) {
      for (const field of duplicates) {
        if (field in DUPLICATE_FIELD_MESSAGES) {
          form.setError(field as keyof SignUpInput, { message: DUPLICATE_FIELD_MESSAGES[field] });
        }
      }
      setBanner('Alguns dados já estão cadastrados. Revise os campos destacados.');
      return;
    }
    const prohibited = prohibitedContentFields(error);
    if (prohibited.length > 0) {
      for (const field of prohibited) {
        form.setError(field as keyof SignUpInput, { message: PROHIBITED_CONTENT_MESSAGE });
      }
      return;
    }
    const imageMessage = imageErrorMessage(error);
    if (imageMessage) {
      form.setError('image', { message: imageMessage });
      return;
    }
    if (error instanceof ApiError && error.status === 400) {
      setBanner('Há dados inválidos no formulário. Revise e tente de novo.');
      return;
    }
    toast.error('Não foi possível cadastrar a instituição. Tente novamente em instantes.');
  }

  async function onSubmit(values: SignUpInput) {
    setBanner(null);
    const kind = kindOf(values.profileType);
    try {
      const created = await institutionsApi.create(kind, toSignUpPayload(values), values.image);
      await queryClient.invalidateQueries({ queryKey: INSTITUTIONS_QUERY_KEY });
      toast.success(CREATED_MESSAGE, { duration: 10_000 });
      void navigate(institutionPath(created.kind, created.id));
    } catch (error) {
      handleError(error);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link to={INSTITUTIONS_PATH}>
            <ArrowLeftIcon />
            Instituições
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Nova instituição</h1>
        <p className="text-muted-foreground text-sm">
          A conta nasce sem o e-mail confirmado: o responsável recebe um código e só entra depois de
          confirmar.
        </p>
      </div>

      {banner && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{banner}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form
          onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
          noValidate
          className="flex flex-col gap-6"
        >
          <Section title="Tipo">
            <FormField
              control={form.control}
              name="profileType"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      className="flex flex-col gap-3 sm:flex-row sm:gap-6"
                    >
                      {INSTITUTION_KINDS.map((kind) => (
                        <div key={kind} className="flex items-center gap-2">
                          <RadioGroupItem value={PROFILE_TYPE[kind]} id={`kind-${kind}`} />
                          <Label htmlFor={`kind-${kind}`} className="font-normal">
                            {INSTITUTION_KIND_LABELS[kind]}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>

          <Section title="Responsável">
            <ResponsibleStep control={form.control} dupPersonal={false} />
          </Section>

          <Section title="Dados institucionais">
            <InstitutionalStep control={form.control} />
          </Section>

          <Section title="Endereço">
            <AddressStep />
          </Section>

          <Section title="Imagem">
            <ProfilePhotoStep control={form.control} />
          </Section>

          <div className="flex gap-3">
            <Button asChild variant="outline" className="flex-1">
              <Link to={INSTITUTIONS_PATH}>Cancelar</Link>
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting && <Loader2Icon className="animate-spin" />}
              {submitting ? 'Cadastrando…' : 'Cadastrar instituição'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
