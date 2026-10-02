import { Outlet } from 'react-router-dom';

import { Topbar } from '@/components/layout/topbar';

export function AppShell() {
  return (
    <div className="bg-background min-h-svh">
      <Topbar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
