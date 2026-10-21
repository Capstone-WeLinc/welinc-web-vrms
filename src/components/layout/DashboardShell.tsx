import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { cn } from '@/lib/utils';
import { AppHeader } from './AppHeader';
import { MobileTabBar } from './MobileTabBar';
import { Sidebar } from './Sidebar';
import { getMobileTabs } from './navItems';
import { useSidebarCollapsed } from './useSidebarCollapsed';

export function DashboardShell() {
  const role = useAuthStore((state) => state.user?.role);
  const { collapsed, toggle } = useSidebarCollapsed();
  // design.md: admins get a sheet menu on phones, everyone else a bottom tab bar.
  const hasTabBar = role !== 'ADMIN';

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} />
      <div
        className={cn(
          'flex min-h-dvh flex-col transition-all duration-200 motion-reduce:transition-none',
          collapsed ? 'md:pl-16' : 'md:pl-64',
        )}
      >
        <AppHeader sidebarCollapsed={collapsed} onToggleSidebar={toggle} />
        <main
          id="main"
          tabIndex={-1}
          className={cn('w-full flex-1 px-4 py-6 outline-none md:px-8 xl:px-12', hasTabBar && 'pb-24 md:pb-6')}
        >
          <Outlet />
        </main>
      </div>
      {hasTabBar && <MobileTabBar items={getMobileTabs(role)} />}
    </div>
  );
}
