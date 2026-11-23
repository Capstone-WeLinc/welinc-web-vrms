import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarAccount, SystemSwitcher } from './SidebarAccount';
import { SidebarAction, SidebarNav } from './SidebarNav';
import { useNavSections } from './useNavSections';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

/**
 * Desktop navigation from 768px up (suite spec 0016 AC-16, design.md Layout and navigation):
 * navy, 240px, the system switcher at the top and the account menu at the bottom; the toggle
 * above it collapses it to a 64px icon strip with a tooltip on each icon.
 */
export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const sections = useNavSections();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-20 hidden flex-col bg-sidebar text-sidebar-foreground transition-all duration-(--duration-fold) ease-enter motion-reduce:transition-none md:flex',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className={cn('shrink-0 pt-3', collapsed ? 'px-2' : 'px-3')}>
        <SystemSwitcher collapsed={collapsed} />
        <hr aria-hidden="true" className="mx-0.5 mt-3.5 border-sidebar-line" />
      </div>

      <div className={cn('flex-1 overflow-x-hidden overflow-y-auto py-3', collapsed ? 'px-2' : 'px-3')}>
        <SidebarNav sections={sections} collapsed={collapsed} />
      </div>

      <div className={cn('flex shrink-0 flex-col gap-1 border-t border-sidebar-line py-3', collapsed ? 'px-2' : 'px-3')}>
        <SidebarAction
          icon={collapsed ? PanelLeftOpen : PanelLeftClose}
          label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={onToggleCollapsed}
          collapsed={collapsed}
          aria-expanded={!collapsed}
        />
        <SidebarAccount collapsed={collapsed} />
      </div>
    </aside>
  );
}
