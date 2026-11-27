import { Link } from 'react-router-dom';
import { LayoutGrid, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { RoleChip } from '@/components/ui/role-chip';
import { useRoleLabel } from '@/lib/roles';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getInitials } from '../../lib/utils/format';
import { useShellActions } from './useShellActions';

/**
 * The signed in user's name and role badge, in the header at every size.
 * The role is `authStore.user.role`, which the login and SSO handoff take from the token.
 */
export function UserMenu() {
  const roleLabel = useRoleLabel();
  const user = useAuthStore((state) => state.user);
  const { canSwitchSystem, switchSystem, signOut } = useShellActions();

  if (!user) return null;
  const name = user.name || user.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex min-h-11 items-center gap-3 rounded-lg py-1 pr-2 pl-1 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-body font-semibold text-primary-foreground"
        >
          {getInitials(name)}
        </span>
        <span className="flex flex-col items-start gap-1">
          {/* Read aloud on phones too, shown from 640px up. */}
          <span className="sr-only text-body leading-none font-medium text-foreground sm:not-sr-only sm:max-w-48 sm:truncate">
            {name}
          </span>
          <RoleChip>{roleLabel(user.role)}</RoleChip>
        </span>
        <ChevronDown aria-hidden="true" className="hidden size-4 text-muted-foreground sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-1 py-2">
          <span className="truncate text-body font-medium text-foreground">{name}</span>
          <span className="truncate text-caption font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <UserIcon aria-hidden="true" />
            Profile
          </Link>
        </DropdownMenuItem>
        {canSwitchSystem && (
          <DropdownMenuItem onSelect={switchSystem}>
            <LayoutGrid aria-hidden="true" />
            Switch system
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
