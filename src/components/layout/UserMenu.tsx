import { Link } from 'react-router-dom';
import { ArrowRightLeft, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { RoleBadge } from '../shared/RoleBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useShellActions } from './useShellActions';

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2);
  return letters.toUpperCase();
}

/**
 * The signed in user's name and role badge, in the header at every size.
 * The role is `authStore.user.role`, which the login and SSO handoff take from the token.
 */
export function UserMenu() {
  const user = useAuthStore((state) => state.user);
  const { canSwitchToVmms, switchToVmms, signOut } = useShellActions();

  if (!user) return null;
  const name = user.name || user.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex min-h-11 items-center gap-3 rounded-lg py-1 pr-2 pl-1 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
        >
          {initialsOf(name)}
        </span>
        <span className="flex flex-col items-start gap-1">
          {/* Read aloud on phones too, shown from 640px up. */}
          <span className="sr-only text-sm leading-none font-medium text-foreground sm:not-sr-only sm:max-w-48 sm:truncate">
            {name}
          </span>
          <RoleBadge role={user.role} />
        </span>
        <ChevronDown aria-hidden="true" className="hidden size-4 text-muted-foreground sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-1 py-2">
          <span className="truncate text-sm font-medium text-foreground">{name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <UserIcon aria-hidden="true" />
            Profile
          </Link>
        </DropdownMenuItem>
        {canSwitchToVmms && (
          <DropdownMenuItem onSelect={switchToVmms}>
            <ArrowRightLeft aria-hidden="true" />
            Switch to VMMS
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
