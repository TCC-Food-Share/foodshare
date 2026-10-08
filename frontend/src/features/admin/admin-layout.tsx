import { LogOutIcon, MenuIcon } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import logoUrl from '@/assets/logo-foodshare.png';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ADMIN_NAV_GROUPS } from '@/features/admin/admin-nav-items';
import { ADMIN_HOME } from '@/features/auth/home-path';
import { useAuth } from '@/features/auth/use-auth';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

function Brand() {
  return (
    <NavLink to={ADMIN_HOME} className="flex items-center gap-3">
      <img src={logoUrl} alt="" className="size-9 object-contain" />
      <div className="flex flex-col leading-tight">
        <span className="font-semibold">Food Share</span>
        <span className="text-muted-foreground text-xs">Painel Admin</span>
      </div>
    </NavLink>
  );
}

function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Painel administrativo" className="flex flex-col gap-6">
      {ADMIN_NAV_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <span className="text-muted-foreground px-3 pb-1 text-xs font-medium tracking-wide uppercase">
            {group.label}
          </span>
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-foreground text-primary font-semibold'
                    : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground',
                )
              }
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

function AccountFooter() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    await navigate('/login', { replace: true });
  }

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      {user && (
        <div className="flex items-center gap-3 px-3">
          <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
            {initials(user.name)}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">{user.name}</span>
            <span className="text-muted-foreground truncate text-xs">{user.email}</span>
          </div>
        </div>
      )}
      <Button
        variant="ghost"
        className="justify-start gap-3 px-3"
        onClick={() => void handleSignOut()}
      >
        <LogOutIcon className="size-4" />
        Sair
      </Button>
    </div>
  );
}

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-background flex min-h-svh">
      <aside className="bg-card sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-8 overflow-y-auto border-r p-4 md:flex">
        <Brand />
        <div className="flex-1">
          <AdminNav />
        </div>
        <AccountFooter />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background sticky top-0 z-40 flex h-16 items-center gap-3 border-b px-4 md:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              className="hover:bg-accent inline-flex size-9 items-center justify-center rounded-md"
              aria-label="Abrir menu do painel"
            >
              <MenuIcon className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 gap-6 overflow-y-auto p-4">
              <SheetHeader className="p-0">
                <SheetTitle className="sr-only">Menu do painel</SheetTitle>
                <SheetDescription className="sr-only">
                  Seções do painel administrativo
                </SheetDescription>
                <Brand />
              </SheetHeader>
              <div className="flex-1">
                <AdminNav onNavigate={() => setMenuOpen(false)} />
              </div>
              <AccountFooter />
            </SheetContent>
          </Sheet>
          <Brand />
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
