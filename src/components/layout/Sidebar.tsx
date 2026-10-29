import { ArrowRightLeft, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandMark } from './BrandMark';
import { SidebarAction, SidebarNav } from './SidebarNav';
import { useNavSections } from './useNavSections';
import { useShellActions } from './useShellActions';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

/** Desktop navigation (768px and up): w-64 expanded, w-16 icon only. */
export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const sections = useNavSections();
  const { canSwitchToVmms, switchToVmms, signOut } = useShellActions();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden flex-col bg-sidebar text-sidebar-foreground transition-all duration-200 motion-reduce:transition-none md:flex',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Same height and rule as the header, so the two read as one top line. */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-sidebar-foreground/10',
          collapsed ? 'justify-center' : 'px-5',
        )}
      >
        <BrandMark compact={collapsed} />
      </div>

      <div className={cn('flex-1 overflow-y-auto py-5', collapsed ? 'px-2' : 'px-3')}>
        <SidebarNav sections={sections} collapsed={collapsed} />
      </div>

      <div className={cn('flex shrink-0 flex-col gap-1 border-t border-sidebar-foreground/10 py-3', collapsed ? 'px-2' : 'px-3')}>
        {canSwitchToVmms && (
          <SidebarAction icon={ArrowRightLeft} label="Switch to VMMS" onClick={switchToVmms} collapsed={collapsed} />
        )}
        <SidebarAction icon={LogOut} label="Sign out" onClick={signOut} collapsed={collapsed} />
        <SidebarAction
          icon={collapsed ? PanelLeftOpen : PanelLeftClose}
          label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={onToggleCollapsed}
          collapsed={collapsed}
          aria-expanded={!collapsed}
        />
      </div>
    </aside>
  );
}
