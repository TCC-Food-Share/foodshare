import { useAuth } from '@/features/auth/use-auth';

export function AdminHomePage() {
  const { user } = useAuth();
  const firstName = user?.name.trim().split(/\s+/)[0];

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">
        {firstName ? `Olá, ${firstName}` : 'Olá'}
      </h1>
      <p className="text-muted-foreground text-sm">
        Escolha uma seção no menu para gerenciar a plataforma.
      </p>
    </div>
  );
}
