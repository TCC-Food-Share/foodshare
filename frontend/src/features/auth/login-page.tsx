import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlertIcon, Loader2Icon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation } from 'react-router-dom';

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
import { BrandPanel } from '@/features/auth/brand-panel';
import { type LoginInput, loginSchema } from '@/features/auth/login-schema';
import { FullPageSpinner } from '@/features/auth/protected-route';
import { useAuth } from '@/features/auth/use-auth';
import { ApiError } from '@/lib/api';

interface LoginLocationState {
  from?: { pathname?: string };
}

export function LoginPage() {
  const { status, signIn } = useAuth();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });

  const from = (location.state as LoginLocationState | null)?.from?.pathname ?? '/feed';

  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'authenticated') return <Navigate to={from} replace />;

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    try {
      await signIn(values.email, values.password);
    } catch (error) {
      setFormError(
        error instanceof ApiError && error.status === 401
          ? 'E-mail ou senha inválidos.'
          : 'Não foi possível entrar. Tente novamente em instantes.',
      );
    }
  }

  const submitting = form.formState.isSubmitting;

  return (
    <div className="flex min-h-svh">
      <BrandPanel />

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">Bem-vindo de volta</h2>
            <p className="text-muted-foreground text-sm">
              Entre com suas credenciais para acessar a plataforma.
            </p>
          </div>

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
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="seu@email.com"
                        {...field}
                      />
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
                    <FormLabel>Senha</FormLabel>
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
        </div>
      </div>
    </div>
  );
}
