import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlertIcon, Loader2Icon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { checkResetCode, requestPasswordReset, resetPassword } from '@/features/auth/api';
import { AuthLayout } from '@/features/auth/auth-layout';
import { AuthHeader, BackToLogin } from '@/features/auth/auth-page-parts';
import { type CodeError, codeRequestError, codeVerifyError } from '@/features/auth/code-messages';
import { CodeStep } from '@/features/auth/code-step';
import { homePathFor } from '@/features/auth/home-path';
import type { LoginNotice } from '@/features/auth/login-page';
import {
  passwordConfirmationField,
  passwordField,
  PASSWORDS_MISMATCH,
  passwordsMatch,
} from '@/features/auth/password-schema';
import { FullPageSpinner } from '@/features/auth/protected-route';
import { useAuth } from '@/features/auth/use-auth';

const emailSchema = z.object({
  email: z
    .string()
    .min(1, 'Informe seu e-mail.')
    .pipe(z.email({ pattern: z.regexes.html5Email, error: 'E-mail inválido.' })),
});

const newPasswordSchema = z
  .object({ password: passwordField, passwordConfirmation: passwordConfirmationField })
  .refine(passwordsMatch, PASSWORDS_MISMATCH);

type Step = 'email' | 'code' | 'password';

/**
 * RF08: e-mail → código → nova senha. E-mail e código ficam só no estado da
 * página, nunca no endereço; recarregar volta à etapa do e-mail.
 */
export function ForgotPasswordPage() {
  const { status, role } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'authenticated') return <Navigate to={homePathFor(role)} replace />;

  function restart() {
    setOtp('');
    setStep('email');
  }

  return (
    <AuthLayout>
      {step === 'email' && (
        <EmailStep
          defaultEmail={email}
          onSent={(sentTo) => {
            setEmail(sentTo);
            setStep('code');
          }}
        />
      )}

      {step === 'code' && (
        <>
          <AuthHeader title="Verifique seu e-mail">
            Se o e-mail estiver cadastrado, enviamos um código de 6 dígitos para{' '}
            <span className="text-foreground font-medium">{email}</span>. Insira-o abaixo para
            confirmar.
          </AuthHeader>
          <CodeStep
            email={email}
            submitLabel="Verificar código"
            submittingLabel="Verificando…"
            onVerify={async (code) => {
              await checkResetCode(email, code);
              setOtp(code);
              setStep('password');
            }}
            onResend={() => requestPasswordReset(email).then(() => undefined)}
            onRequestNew={restart}
          />
        </>
      )}

      {step === 'password' && (
        <NewPasswordStep
          email={email}
          otp={otp}
          onDone={() => {
            const state: LoginNotice = { notice: 'password-reset', email };
            void navigate('/login', { replace: true, state });
          }}
          onRequestNew={restart}
        />
      )}

      <BackToLogin />
    </AuthLayout>
  );
}

function EmailStep({
  defaultEmail,
  onSent,
}: {
  defaultEmail: string;
  onSent: (email: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    mode: 'onTouched',
    defaultValues: { email: defaultEmail },
  });

  async function onSubmit({ email }: z.infer<typeof emailSchema>) {
    setError(null);
    try {
      await requestPasswordReset(email);
      onSent(email);
    } catch (err) {
      setError(codeRequestError(err).message);
    }
  }

  const submitting = form.formState.isSubmitting;

  return (
    <>
      <AuthHeader title="Esqueci minha senha">
        Informe o e-mail cadastrado e enviaremos um código de verificação para você redefinir sua
        senha.
      </AuthHeader>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <CircleAlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" placeholder="seu@email.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2Icon className="animate-spin" />}
            {submitting ? 'Enviando…' : 'Enviar código'}
          </Button>
        </form>
      </Form>
    </>
  );
}

function NewPasswordStep({
  email,
  otp,
  onDone,
  onRequestNew,
}: {
  email: string;
  otp: string;
  onDone: () => void;
  onRequestNew: () => void;
}) {
  const [error, setError] = useState<CodeError | null>(null);
  const form = useForm<z.infer<typeof newPasswordSchema>>({
    resolver: zodResolver(newPasswordSchema),
    mode: 'onTouched',
    defaultValues: { password: '', passwordConfirmation: '' },
  });

  async function onSubmit({ password }: z.infer<typeof newPasswordSchema>) {
    setError(null);
    try {
      await resetPassword(email, otp, password);
      onDone();
    } catch (err) {
      setError(codeVerifyError(err, 'use'));
    }
  }

  const submitting = form.formState.isSubmitting;

  return (
    <>
      <AuthHeader title="Crie uma nova senha">Use de 8 a 72 caracteres.</AuthHeader>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <CircleAlertIcon />
          <AlertDescription>
            <p>{error.message}</p>
            {error.action === 'request-new' && (
              <Button type="button" variant="link" className="h-auto p-0" onClick={onRequestNew}>
                Pedir um novo código
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nova senha</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Digite sua nova senha"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="passwordConfirmation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar nova senha</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Digite novamente sua nova senha"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2Icon className="animate-spin" />}
            {submitting ? 'Redefinindo…' : 'Redefinir senha'}
          </Button>
        </form>
      </Form>
    </>
  );
}
