import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useRoleLabel } from '@/lib/roles';
import { useAuthStore } from '../../store/authStore';
import { CollapsedTooltip } from './SidebarNav';

/** The gold W tile (32px) of the VRMS title and the phone top bar. */
export function VrmsTile() {
  return (
    <span
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-md bg-highlight font-bold text-highlight-foreground"
    >
      W
    </span>
  );
}

/**
 * Spec 0027, AC-10a (board `Shell20`, built like Suite management's title): the W tile, "VRMS" and
 * your VRMS role in muted white under it, a link to the dashboard. Collapsed only the tile shows.
 */
export function SidebarTitle({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const user = useAuthStore((state) => state.user);
  const roleLabel = useRoleLabel();
  const role = user ? roleLabel(user.role) : '';

  return (
    <CollapsedTooltip label="VRMS" collapsed={collapsed}>
      <Link
        to="/"
        onClick={onNavigate}
        aria-label={collapsed ? `VRMS, ${role}, dashboard` : undefined}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 text-left text-sidebar-foreground outline-none hover:bg-sidebar-hover focus-visible:ring-2 focus-visible:ring-ring-on-dark',
          collapsed && 'justify-center px-0',
        )}
      >
        <VrmsTile />
        {/* Expanded, the spoken name is the visible text (axe label-content-name-mismatch) */}
        <span className={cn('flex min-w-0 flex-1 flex-col', collapsed && 'hidden')}>
          <span className="truncate text-group font-bold">VRMS</span>
          <span className="truncate text-caption font-normal text-sidebar-idle">{role}</span>
        </span>
      </Link>
    </CollapsedTooltip>
  );
}
