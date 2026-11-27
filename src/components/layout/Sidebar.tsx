import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCan } from '../../lib/permissions/usePermissions';
import { NewRepairButton } from './NewRepairButton';
import { SidebarFooter } from './SidebarFooter';
import { CollapsedTooltip, SidebarNav } from './SidebarNav';
import { SidebarTitle } from './SidebarTitle';
import { useNavSections } from './useNavSections';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Collapsed, choosing a page with sub pages expands the sidebar. */
  onExpand: () => void;
}

const FOOTER_BUTTON =
  'flex size-8 shrink-0 items-center justify-center rounded-lg text-sidebar-idle outline-none hover:bg-sidebar-hover hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring-on-dark';

/**
 * Desktop navigation from 768px up (suite spec 0016 AC-16; spec 0027, AC-8, AC-10a, AC-10b): navy,
 * 240px, the VRMS title with your role at the top, New repair under it, the sections, and the
 * footer strip whose button collapses it to a 64px icon strip with a tooltip on each icon.
 */
export function Sidebar({ collapsed, onToggleCollapsed, onExpand }: SidebarProps) {
  const sections = useNavSections();
  const canCreate = useCan('ticket.create');
  const toggleLabel = collapsed ? 'Expand sidebar' : 'Collapse sidebar';

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-20 hidden flex-col bg-sidebar text-sidebar-foreground transition-all duration-(--duration-fold) ease-enter motion-reduce:transition-none md:flex',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className={cn('shrink-0 pt-3', collapsed ? 'px-2' : 'px-3')}>
        <SidebarTitle collapsed={collapsed} />
        <hr aria-hidden="true" className="mx-0.5 mt-3.5 border-sidebar-line" />
        {/* AC-8: New repair under the title; without the key the line and 12px of space stay */}
        {canCreate && (
          <div className="pt-3">
            <NewRepairButton collapsed={collapsed} />
          </div>
        )}
      </div>

      <div className={cn('flex-1 overflow-x-hidden overflow-y-auto py-3', collapsed ? 'px-2' : 'px-3')}>
        <SidebarNav sections={sections} collapsed={collapsed} onExpand={onExpand} />
      </div>

      <SidebarFooter collapsed={collapsed}>
        <CollapsedTooltip label={toggleLabel} collapsed={collapsed}>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={toggleLabel}
            aria-expanded={!collapsed}
            className={FOOTER_BUTTON}
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" className="size-4.5" />
            ) : (
              <PanelLeftClose aria-hidden="true" className="size-4.5" />
            )}
          </button>
        </CollapsedTooltip>
      </SidebarFooter>
    </aside>
  );
}
