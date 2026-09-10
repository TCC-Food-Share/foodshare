import { MenuIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { navItemsFor } from '@/components/layout/nav-items';
import { UserMenu } from '@/components/layout/user-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth/use-auth';
import { cn } from '@/lib/cn';

export function Topbar() {
  const { role } = useAuth();
  const items = navItemsFor(role);

  return (
    <header className="bg-background sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <NavLink to="/feed" className="text-lg font-semibold tracking-tight">
          Food Share
        </NavLink>

        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'hover:bg-accent hover:text-accent-foreground rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2 md:flex-none">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="hover:bg-accent inline-flex size-9 items-center justify-center rounded-md md:hidden"
              aria-label="Abrir navegação"
            >
              <MenuIcon className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {items.map((item) => (
                <DropdownMenuItem key={item.to} asChild>
                  <NavLink to={item.to}>{item.label}</NavLink>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
