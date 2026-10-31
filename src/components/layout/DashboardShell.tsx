import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { DataModeToggle } from '../../features/dev-ui/components/DataModeToggle';
import { AppHeader } from './AppHeader';
import { MobileTabBar } from './MobileTabBar';
import { Sidebar } from './Sidebar';
import { getMobileTabs, usesTabBar } from './navItems';
import { useNavSections } from './useNavSections';
import { useSidebarCollapsed } from './useSidebarCollapsed';

export function DashboardShell() {
  const sections = useNavSections();
  const { collapsed, toggle } = useSidebarCollapsed();
  // design.md: a bottom tab bar on phones when the nav fits in it, else the sheet menu
  const hasTabBar = usesTabBar(sections);

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} onToggleCollapsed={toggle} />
      <div
        className={cn(
          'flex min-h-dvh flex-col transition-all duration-200 motion-reduce:transition-none',
          collapsed ? 'md:pl-16' : 'md:pl-64',
        )}
      >
        <AppHeader />
        <main
          id="main"
          tabIndex={-1}
          className={cn('w-full flex-1 px-4 py-6 outline-none md:px-8 xl:px-12', hasTabBar && 'pb-24 md:pb-6')}
        >
          <Outlet />
        </main>
      </div>
      {hasTabBar && <MobileTabBar items={getMobileTabs(sections)} />}
      {import.meta.env.DEV && <DataModeToggle />}
    </div>
  );
}
