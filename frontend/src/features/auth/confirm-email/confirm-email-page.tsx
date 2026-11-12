import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactNode, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

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
import { resendVerificationCode, verifyEmail } from '@/features/auth/api';
import { AuthLayout } from '@/features/auth/auth-layout';
import { AuthHeader, BackToLogin } from '@/features/auth/auth-page-parts';
import { CodeStep } from '@/features/auth/code-step';
import { homePathFor } from '@/features/auth/home-path';
import type { LoginNotice } from '@/features/auth/login-page';
import { FullPageSpinner } from '@/features/auth/protected-route';
import { useAuth } from '@/features/auth/use-auth';

/** Estado de navegação da tela (o e-mail nunca vai para o endereço). */
export interface ConfirmEmailState {
  email: string;
  from: 'sign-up' | 'sign-in';
}

const emailSchema = z.object({
  email: z
    .string()
    .min(1, 'Informe seu e-mail.')
    .pipe(z.email({ pattern: z.regexes.html5Email, error: 'E-mail inválido.' })),
});

function readState(state: unknown): Partial<ConfirmEmailState> {
  if (!state || typeof state !== 'object') return {};
  const { email, from } = state as Partial<ConfirmEmailState>;
  return {
    email: typeof email === 'string' ? email : undefined,
    from: from === 'sign-up' || from === 'sign-in' ? from : undefined,
  };
}

function introFor(from: ConfirmEmailState['from'] | undefined, email: ReactNode): ReactNode {
  if (from === 'sign-up') {
    return <>Enviamos um código de 6 dígitos para {email}. Ele vale por 10 minutos.</>;
  }
  if (from === 'sign-in') {
    return (
      <>
        Confirme seu e-mail para entrar. Se o código que enviamos para {email} expirou, peça um
        novo.
      </>
    );
  }
  return <>Digite o código de 6 dígitos que enviamos para {email}. Se ele expirou, peça um novo.</>;
}

/** RF75: confirmação do e-mail pessoal por código, antes do primeiro login. */
export function ConfirmEmailPage() {
  const { status, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const initial = readState(location.state);
  const [email, setEmail] = useState(initial.email ?? '');

  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'authenticated') return <Navigate to={homePathFor(role)} replace />;

  if (!email) {
    return (
      <AuthLayout>
        <EmailEntry onSubmit={setEmail} />
        <BackToLogin />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthHeader title="Confirme seu e-mail">
        {introFor(initial.from, <span className="text-foreground font-medium">{email}</span>)}
      </AuthHeader>
      <CodeStep
        email={email}
        submitLabel="Confirmar e-mail"
        submittingLabel="Confirmando…"
        onVerify={async (code) => {
          await verifyEmail(email, code);
          const state: LoginNotice = { notice: 'email-verified', email };
          void navigate('/login', { replace: true, state });
        }}
        onResend={() => resendVerificationCode(email).then(() => undefined)}
      />
      <BackToLogin />
    </AuthLayout>
  );
}

function EmailEntry({ onSubmit }: { onSubmit: (email: string) => void }) {
  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    mode: 'onTouched',
    defaultValues: { email: '' },
  });

  return (
    <>
      <AuthHeader title="Confirme seu e-mail">
        Informe o e-mail usado no cadastro para digitar o código de confirmação.
      </AuthHeader>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(({ email }) => onSubmit(email))}
          className="flex flex-col gap-5"
          noValidate
        >
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

          <Button type="submit">Continuar</Button>
        </form>
      </Form>
    </>
  );
}
