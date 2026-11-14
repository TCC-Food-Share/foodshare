import { zodResolver } from '@hookform/resolvers/zod';
import { useIsMutating, useMutation, useQuery } from '@tanstack/react-query';
import { CircleAlertIcon, Loader2Icon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { InstitutionRole } from '@/features/auth/auth-context';
import { useAuth } from '@/features/auth/use-auth';
import {
  deleteMyAccount,
  type DeletionImpact,
  getDeletionImpact,
} from '@/features/profile/profile-api';
import { errorCode } from '@/lib/api';

const CONFIRMATION_WORD = 'EXCLUIR';
const DELETE_ACCOUNT_MUTATION = ['delete-account'] as const;

const deleteAccountSchema = z.object({
  confirmation: z.string().refine((value): boolean => value === CONFIRMATION_WORD, {
    message: `Digite ${CONFIRMATION_WORD} em letras maiúsculas.`,
  }),
  password: z.string().min(1, 'Informe sua senha.'),
});

type DeleteAccountValues = z.infer<typeof deleteAccountSchema>;

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

// RN28/RN29: what the deletion does to the open orders, from the point of view of who deletes.
function impactLines(role: InstitutionRole, impact: DeletionImpact): string[] {
  const { pendingOrders: pending, inProgressOrders: inProgress } = impact;
  if (pending === 0 && inProgress === 0) return ['Você não tem pedidos em aberto.'];

  if (role === 'establishment') {
    const lines: string[] = [];
    if (pending > 0) {
      lines.push(
        `${pending} ${plural(pending, 'pedido pendente será rejeitado', 'pedidos pendentes serão rejeitados')}.`,
      );
    }
    if (inProgress > 0) {
      lines.push(
        `${inProgress} ${plural(inProgress, 'pedido em andamento será cancelado', 'pedidos em andamento serão cancelados')}.`,
      );
    }
    return lines;
  }

  const parts: string[] = [];
  if (pending > 0)
    parts.push(`${pending} ${plural(pending, 'pedido pendente', 'pedidos pendentes')}`);
  if (inProgress > 0) {
    parts.push(
      `${inProgress} ${plural(inProgress, 'pedido em andamento', 'pedidos em andamento')}`,
    );
  }
  const total = pending + inProgress;
  return [`${parts.join(' e ')} ${plural(total, 'será cancelado', 'serão cancelados')}.`];
}

function effectText(role: InstitutionRole): string {
  return role === 'establishment'
    ? 'Todos os seus alimentos saem do ar.'
    : 'As quantidades dos pedidos em andamento voltam para os estabelecimentos.';
}

function ImpactSummary({ role }: { role: InstitutionRole }) {
  const query = useQuery({
    queryKey: ['deletion-impact', role],
    queryFn: () => getDeletionImpact(role),
    gcTime: 0,
  });

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertDescription>
          Não foi possível verificar seus pedidos em aberto. Feche e tente de novo.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <ul className="text-sm marker:text-muted-foreground list-disc space-y-1 pl-5">
      {impactLines(role, query.data).map((line) => (
        <li key={line}>{line}</li>
      ))}
      <li>{effectText(role)}</li>
    </ul>
  );
}

function DeleteAccountForm({ role, onClose }: { role: InstitutionRole; onClose: () => void }) {
  const { endSession } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(false);

  const form = useForm<DeleteAccountValues>({
    resolver: zodResolver(deleteAccountSchema),
    mode: 'onChange',
    defaultValues: { confirmation: '', password: '' },
  });

  const mutation = useMutation({
    mutationKey: DELETE_ACCOUNT_MUTATION,
    mutationFn: (password: string) => deleteMyAccount(role, password),
  });

  async function onSubmit(values: DeleteAccountValues) {
    setServerError(false);
    try {
      await mutation.mutateAsync(values.password);
    } catch (error) {
      if (errorCode(error) === 'INVALID_PASSWORD') {
        form.setError('password', { message: 'Senha incorreta.' }, { shouldFocus: true });
        return;
      }
      setServerError(true);
      return;
    }
    // The server already ended every session: only the local state is left to clear.
    toast.success('Sua conta foi excluída.');
    endSession();
    void navigate('/login', { replace: true });
  }

  const pending = mutation.isPending;

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
        noValidate
        className="flex flex-col gap-4"
      >
        {serverError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>
              Não foi possível excluir a conta. Tente novamente em instantes.
            </AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="confirmation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {/* One span: FormLabel is a flex row with a gap between children. */}
                <span>
                  Digite <span className="font-semibold">{CONFIRMATION_WORD}</span> para confirmar
                </span>
              </FormLabel>
              <FormControl>
                <Input autoComplete="off" disabled={pending} {...field} />
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
                  disabled={pending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" variant="destructive" disabled={!form.formState.isValid || pending}>
            {pending ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
            {pending ? 'Excluindo…' : 'Excluir conta'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export function DeleteAccountDialog({
  role,
  open,
  onOpenChange,
}: {
  role: InstitutionRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // The dialog cannot be closed while the deletion is running.
  const locked = useIsMutating({ mutationKey: DELETE_ACCOUNT_MUTATION }) > 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !locked && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir sua conta?</DialogTitle>
          <DialogDescription>
            Essa ação não pode ser desfeita. Seu e-mail, CNPJ e celulares continuam vinculados à
            conta excluída e não poderão ser usados em um novo cadastro.
          </DialogDescription>
        </DialogHeader>

        {open && (
          <div className="flex flex-col gap-4">
            <ImpactSummary role={role} />
            <DeleteAccountForm role={role} onClose={() => onOpenChange(false)} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
