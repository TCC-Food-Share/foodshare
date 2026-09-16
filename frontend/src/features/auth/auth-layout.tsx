import type { ReactNode } from 'react';

import { BrandPanel } from '@/features/auth/brand-panel';
import { cn } from '@/lib/cn';

export function AuthLayout({
  children,
  contentClassName,
}: {
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="flex min-h-svh">
      <BrandPanel />

      <div className="flex flex-1 items-center justify-center p-6">
        <div className={cn('w-full max-w-sm', contentClassName)}>{children}</div>
      </div>
    </div>
  );
}
