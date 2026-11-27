import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCan } from '../../lib/permissions/usePermissions';
import { CollapsedTooltip } from './SidebarNav';

/**
 * Spec 0027, AC-8: the full width primary action under the switcher; collapsed, a 40px icon
 * button with a tooltip. White on navy, not the board's gold: gold is kept for "needs you"
 * (design.md, Signature 3).
 */
export function NewRepairButton({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <CollapsedTooltip label="New repair" collapsed={collapsed}>
      <Link
        to="/repairs/new"
        onClick={onNavigate}
        aria-label={collapsed ? 'New repair' : undefined}
        className={cn(
          'flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-sidebar-foreground text-body font-semibold text-sidebar transition-colors duration-(--duration-menu) outline-none hover:bg-sidebar-foreground/90 focus-visible:ring-2 focus-visible:ring-ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar active:scale-96 motion-reduce:transition-none max-md:h-11',
          collapsed ? 'mx-auto w-10' : 'w-full',
        )}
      >
        <Plus aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.5} />
        {!collapsed && 'New repair'}
      </Link>
    </CollapsedTooltip>
  );
}

/**
 * Spec 0027, AC-8: on phones New repair is the primary action in the header of the dashboard and
 * the Repair tickets page; from 768px up the sidebar's button holds it.
 */
export function PhoneNewRepairAction() {
  const canCreate = useCan('ticket.create');
  if (!canCreate) return null;
  return (
    <Button asChild className="max-md:h-11 md:hidden">
      <Link to="/repairs/new">
        <Plus aria-hidden="true" />
        New repair
      </Link>
    </Button>
  );
}
