import { Link } from 'react-router-dom';
import { LogOut, UserRound } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { getInitials } from '../../lib/utils/format';
import { useAuthStore } from '../../store/authStore';
import { useShellActions } from './useShellActions';

/** Initials on the portal's light avatar (VRMS has no picture). */
function Initials({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-primary text-caption font-semibold text-primary-foreground',
        className,
      )}
    >
      {getInitials(name)}
    </span>
  );
}

/**
 * Spec 0027, AC-10 (board `Switcher16`, the portal's light `AccountMenu`): your initials top
 * right, opening Your profile and Sign out. No `aria-label`: the spoken name holds the visible
 * initials (axe label-content-name-mismatch).
 */
export function AccountMenu() {
  const user = useAuthStore((state) => state.user);
  const { signOut } = useShellActions();
  if (!user) return null;
  const name = user.name || user.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex size-10 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:size-11">
        <Initials name={name} className="size-10" />
        <span className="sr-only">Account menu for {name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-3 font-normal">
          <Initials name={name} className="size-10" />
          <div className="min-w-0">
            <p className="truncate text-body font-medium text-foreground">{user.name}</p>
            <p className="truncate text-caption text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          {/* Foreground like Sign out, not the base link navy */}
          <Link to="/profile" className="text-foreground hover:text-foreground">
            <UserRound aria-hidden="true" />
            Your profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
