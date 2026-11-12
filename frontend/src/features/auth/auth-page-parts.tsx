import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

export function AuthHeader({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-2">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="text-muted-foreground text-sm">{children}</p>
    </div>
  );
}

export function BackToLogin() {
  return (
    <>
      <div className="my-6 flex items-center gap-4">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs">ou</span>
        <span className="bg-border h-px flex-1" />
      </div>

      <Button asChild variant="outline" className="w-full">
        <Link to="/login">Voltar para o login</Link>
      </Button>
    </>
  );
}
