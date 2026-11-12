import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlertIcon, CircleCheckIcon, Loader2Icon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

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
import { AuthLayout } from '@/features/auth/auth-layout';
import type { ConfirmEmailState } from '@/features/auth/confirm-email/confirm-email-page';
import { homePathFor, isPathOfRoleArea } from '@/features/auth/home-path';
import { type LoginInput, loginSchema } from '@/features/auth/login-schema';
import { FullPageSpinner } from '@/features/auth/protected-route';
import { useAuth } from '@/features/auth/use-auth';
import { ApiError, errorCode } from '@/lib/api';

/** Aviso mostrado no login depois da recuperação de senha ou da confirmação de e-mail. */
export interface LoginNotice {
  notice: 'password-reset' | 'email-verified';
  email: string;
}

interface LoginLocationState extends Partial<LoginNotice> {
  from?: { pathname?: string };
}

const NOTICE_MESSAGES: Record<LoginNotice['notice'], string> = {
  'password-reset': 'Senha redefinida. Entre com a nova senha.',
  'email-verified': 'E-mail confirmado. Entre com sua senha.',
};

export function LoginPage() {
  const { status, role, signIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const locationState = location.state as LoginLocationState | null;
  const notice = locationState?.notice ? NOTICE_MESSAGES[locationState.notice] : null;

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { email: locationState?.email ?? '', password: '' },
  });

  const from = locationState?.from?.pathname;

  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'authenticated') {
    const target = from && isPathOfRoleArea(role, from) ? from : homePathFor(role);
    return <Navigate to={target} replace />;
  }

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    try {
      await signIn(values.email, values.password);
    } catch (error) {
      // RN47: conta com e-mail não confirmado vai para a tela de confirmação.
      if (errorCode(error) === 'EMAIL_NOT_VERIFIED') {
        const state: ConfirmEmailState = { email: values.email, from: 'sign-in' };
        void navigate('/confirmar-email', { state });
        return;
      }
      setFormError(
        error instanceof ApiError && error.status === 401
          ? 'E-mail ou senha inválidos.'
          : 'Não foi possível entrar. Tente novamente em instantes.',
      );
    }
  }

  const submitting = form.formState.isSubmitting;

  return (
    <AuthLayout>
      <div className="mb-8 flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">Bem-vindo de volta</h2>
        <p className="text-muted-foreground text-sm">
          Entre com suas credenciais para acessar a plataforma.
        </p>
      </div>

      {notice && !formError && (
        <Alert className="mb-6">
          <CircleCheckIcon />
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      {formError && (
        <Alert variant="destructive" className="mb-6">
          <CircleAlertIcon />
          <AlertDescription>{formError}</AlertDescription>
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

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-2">
                  <FormLabel>Senha</FormLabel>
                  <Link
                    to="/esqueci-senha"
                    className="text-primary text-sm font-medium hover:underline"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2Icon className="animate-spin" />}
            {submitting ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </Form>

      <div className="my-6 flex items-center gap-4">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs">ou</span>
        <span className="bg-border h-px flex-1" />
      </div>

      <Button asChild variant="outline" className="w-full">
        <Link to="/cadastro">Criar uma conta</Link>
      </Button>
    </AuthLayout>
  );
}
