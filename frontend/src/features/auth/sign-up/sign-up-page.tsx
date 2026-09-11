import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlertIcon, Loader2Icon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { AuthLayout } from '@/features/auth/auth-layout';
import { FullPageSpinner } from '@/features/auth/protected-route';
import { AddressStep } from '@/features/auth/sign-up/address-step';
import { InstitutionalStep } from '@/features/auth/sign-up/institutional-step';
import { ProfileTypeStep } from '@/features/auth/sign-up/profile-type-step';
import { ResponsibleStep } from '@/features/auth/sign-up/responsible-step';
import {
  createBeneficiaryEntity,
  createEstablishment,
  toSignUpPayload,
} from '@/features/auth/sign-up/sign-up-api';
import {
  type SignUpInput,
  signUpSchema,
  STEP_FIELDS,
} from '@/features/auth/sign-up/sign-up-schema';
import { WizardProgress } from '@/features/auth/sign-up/wizard-progress';
import { useAuth } from '@/features/auth/use-auth';
import { ApiError } from '@/lib/api';

const LAST_STEP = 3;

const FIELD_TO_STEP: Record<string, number> = {
  cnpj: 1,
  institutionalEmail: 1,
  institutionalPhone: 1,
  personal: 2,
};

const FIELD_MESSAGES: Record<string, string> = {
  cnpj: 'Este CNPJ já está cadastrado.',
  institutionalEmail: 'Este e-mail institucional já está cadastrado.',
  institutionalPhone: 'Este celular institucional já está cadastrado.',
};

type ServerError =
  | { kind: 'dup-fields'; fields: string[] }
  | { kind: 'dup-race' }
  | { kind: 'invalid' }
  | { kind: 'network' };

function bannerText(error: ServerError): string {
  switch (error.kind) {
    case 'dup-fields':
      return 'Alguns dados informados já estão cadastrados. Revise os campos destacados.';
    case 'dup-race':
      return 'Não foi possível concluir: CNPJ, e-mail ou celular já cadastrados. Revise os dados e tente de novo.';
    case 'invalid':
      return 'Há dados inválidos no formulário. Revise e tente de novo.';
    case 'network':
      return 'Não foi possível concluir o cadastro. Tente novamente em instantes.';
  }
}

function extractDuplicateFields(body: unknown): string[] {
  if (body && typeof body === 'object' && 'fields' in body) {
    const fields = body.fields;
    if (Array.isArray(fields)) {
      return fields.filter((value): value is string => typeof value === 'string');
    }
  }
  return [];
}

export function SignUpPage() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<ServerError | null>(null);

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    mode: 'onTouched',
    defaultValues: {
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

  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'authenticated') return <Navigate to="/feed" replace />;

  const dupPersonal = serverError?.kind === 'dup-fields' && serverError.fields.includes('personal');
  const submitting = form.formState.isSubmitting;

  function goToStep(next: number) {
    setServerError(null);
    setStep(next);
  }

  async function goNext() {
    const ok = await form.trigger([...STEP_FIELDS[step]]);
    if (ok) goToStep(Math.min(step + 1, LAST_STEP));
  }

  function goBack() {
    goToStep(Math.max(step - 1, 0));
  }

  function handleSubmitError(error: unknown) {
    if (error instanceof ApiError && error.status === 409) {
      const fields = extractDuplicateFields(error.body);
      if (fields.length > 0) {
        for (const fieldName of fields) {
          if (fieldName in FIELD_MESSAGES) {
            form.setError(fieldName as keyof SignUpInput, { message: FIELD_MESSAGES[fieldName] });
          }
        }
        setServerError({ kind: 'dup-fields', fields });
        setStep(Math.min(...fields.map((fieldName) => FIELD_TO_STEP[fieldName] ?? LAST_STEP)));
        return;
      }
      setServerError({ kind: 'dup-race' });
      return;
    }
    if (error instanceof ApiError && error.status === 400) {
      setServerError({ kind: 'invalid' });
      return;
    }
    setServerError({ kind: 'network' });
  }

  async function onSubmit(values: SignUpInput) {
    setServerError(null);
    const create =
      values.profileType === 'establishment' ? createEstablishment : createBeneficiaryEntity;
    try {
      await create(toSignUpPayload(values));
      toast.success('Conta criada! Entre com seu e-mail e senha.');
      void navigate('/login', { replace: true });
    } catch (error) {
      handleSubmitError(error);
    }
  }

  return (
    <AuthLayout contentClassName="max-w-md">
      <WizardProgress step={step} />

      {serverError && (
        <Alert variant="destructive" className="mb-6">
          <CircleAlertIcon />
          <AlertDescription>{bannerText(serverError)}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        {/* No native submit: the wizard advances/submits through explicit button
            clicks. A submit button whose JSX slot flips between "Continuar" and
            "Finalizar" lets React reuse the same <button> node and a click that
            started on "Continuar" can land as a submit. */}
        <form onSubmit={(e) => e.preventDefault()} noValidate className="flex flex-col gap-6">
          {step === 0 && <ProfileTypeStep control={form.control} />}
          {step === 1 && <InstitutionalStep control={form.control} />}
          {step === 2 && <ResponsibleStep control={form.control} dupPersonal={dupPersonal} />}
          {step === 3 && <AddressStep />}

          <div className="flex gap-3">
            {step > 0 && (
              <Button type="button" variant="outline" className="flex-1" onClick={goBack}>
                Voltar
              </Button>
            )}
            {step < LAST_STEP ? (
              <Button type="button" className="flex-1" onClick={goNext}>
                Continuar
              </Button>
            ) : (
              <Button
                type="button"
                className="flex-1"
                disabled={submitting}
                onClick={() => void form.handleSubmit(onSubmit)()}
              >
                {submitting && <Loader2Icon className="animate-spin" />}
                {submitting ? 'Enviando…' : 'Finalizar cadastro'}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </AuthLayout>
  );
}
