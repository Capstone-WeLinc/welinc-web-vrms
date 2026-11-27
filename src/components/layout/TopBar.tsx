import { Link } from 'react-router-dom';
import { AccountMenu } from './AccountMenu';
import { Breadcrumbs } from './Breadcrumbs';
import { MobileNavSheet } from './MobileNavSheet';
import { SystemSwitcher } from './SystemSwitcher';
import { VrmsTile } from './SidebarTitle';
import type { NavSection } from './navItems';
import { useShellActions } from './useShellActions';

/**
 * Spec 0027, AC-9 (board `Shell20`, built like the portal's Suite management top bar): white,
 * sticky, 64px, at every size. The breadcrumb on the left; the switcher and your avatar on the
 * right (the feature 28 bell joins left of the switcher, AC-9b). Below 768px it starts with the
 * sheet's menu button, or the W tile going to the dashboard when you get the tab bar.
 */
export function TopBar({ sections, hasTabBar }: { sections: NavSection[]; hasTabBar: boolean }) {
  const { canSwitchSystem } = useShellActions();

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card px-4 sm:px-6 lg:px-8">
      {hasTabBar ? (
        <Link
          to="/"
          aria-label="VRMS dashboard"
          className="flex size-11 items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          <VrmsTile />
        </Link>
      ) : (
        <MobileNavSheet sections={sections} />
      )}
      <Breadcrumbs />
      {canSwitchSystem && <SystemSwitcher />}
      <AccountMenu />
    </header>
  );
}
