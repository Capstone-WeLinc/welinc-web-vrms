import { Link } from 'react-router-dom';
import { ChevronsUpDown, ChevronUp, LayoutGrid, LogOut, User as UserIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useRoleLabel } from '@/lib/roles';
import { getInitials } from '../../lib/utils/format';
import { useAuthStore } from '../../store/authStore';
import { CollapsedTooltip } from './SidebarNav';
import { useShellActions } from './useShellActions';

const ROW = 'flex w-full items-center gap-2.5 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring-on-dark';

/**
 * The system switcher at the top of the sidebar (board Sidebars8): the gold tile, the system and
 * what it is for. With another system to go to it is a button to the portal launcher; collapsed
 * only the tile shows.
 */
export function SystemSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { canSwitchSystem, switchSystem } = useShellActions();
  const body = (
    <>
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-highlight font-bold text-highlight-foreground"
      >
        W
      </span>
      <span className={cn('flex min-w-0 flex-1 flex-col', collapsed && 'sr-only')}>
        <span className="truncate text-group font-bold">VRMS</span>
        <span className="truncate text-caption font-normal text-sidebar-idle">Vehicle repairs</span>
      </span>
      {canSwitchSystem && !collapsed && <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-sidebar-idle" />}
    </>
  );

  if (!canSwitchSystem) {
    return <div className={cn(ROW, 'px-2 py-1.5', collapsed && 'justify-center px-0')}>{body}</div>;
  }
  return (
    <CollapsedTooltip label="Switch system" collapsed={collapsed}>
      <button
        type="button"
        onClick={switchSystem}
        aria-label={collapsed ? 'VRMS, switch system' : undefined}
        className={cn(ROW, 'bg-sidebar-hover px-2 py-1.5 hover:bg-sidebar-current', collapsed && 'justify-center px-0')}
      >
        {body}
      </button>
    </CollapsedTooltip>
  );
}

/** The account menu at the bottom of the sidebar: you, your role, Profile and Sign out. */
export function SidebarAccount({ collapsed = false }: { collapsed?: boolean }) {
  const roleLabel = useRoleLabel();
  const user = useAuthStore((state) => state.user);
  const { canSwitchSystem, switchSystem, signOut } = useShellActions();
  if (!user) return null;
  const name = user.name || user.email;

  return (
    <DropdownMenu>
      <CollapsedTooltip label={name} collapsed={collapsed}>
        <DropdownMenuTrigger
          aria-label={`Account: ${name}, ${roleLabel(user.role)}`}
          className={cn(ROW, 'min-h-11 px-1.5 py-1.5 hover:bg-sidebar-hover', collapsed && 'justify-center px-0')}
        >
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-count text-caption font-bold"
          >
            {getInitials(name)}
          </span>
          {!collapsed && (
            <>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-small font-semibold">{name}</span>
                <span className="truncate text-caption text-sidebar-idle">{roleLabel(user.role)}</span>
              </span>
              <ChevronUp aria-hidden="true" className="size-4 shrink-0 text-sidebar-idle" />
            </>
          )}
        </DropdownMenuTrigger>
      </CollapsedTooltip>
      <DropdownMenuContent side="top" align="start" className="w-60">
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
