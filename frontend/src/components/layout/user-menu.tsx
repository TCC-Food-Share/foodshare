import { LogOutIcon, UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth/use-auth';

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    await navigate('/login', { replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="bg-secondary text-secondary-foreground focus-visible:ring-ring flex size-9 items-center justify-center rounded-full text-sm font-medium outline-none focus-visible:ring-2"
        aria-label="Menu do usuário"
      >
        {user ? initials(user.name) : <UserIcon className="size-4" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {user && (
          <>
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="truncate font-medium">{user.name}</span>
              <span className="text-muted-foreground truncate text-xs font-normal">
                {user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={() => navigate('/perfil')}>
          <UserIcon />
          Meu perfil
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => void handleSignOut()}>
          <LogOutIcon />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
