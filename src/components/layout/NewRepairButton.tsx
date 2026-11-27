import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
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
