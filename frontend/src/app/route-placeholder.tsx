import { useLocation } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';

export function RoutePlaceholder({ feature, title }: { feature: string; title: string }) {
  const location = useLocation();
  const { role } = useAuth();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-2 py-16 text-center">
      <p className="text-muted-foreground text-sm font-medium">{feature} — em construção</p>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground text-sm">
        rota <code className="bg-muted rounded px-1">{location.pathname}</code>
        {role ? ` · papel: ${role}` : ''}
      </p>
    </div>
  );
}
