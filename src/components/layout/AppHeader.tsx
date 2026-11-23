import { BrandMark } from './BrandMark';
import { MobileNavSheet } from './MobileNavSheet';
import { UserMenu } from './UserMenu';
import { usesTabBar } from './navItems';
import { useNavSections } from './useNavSections';

/**
 * The phone top bar (below 768px): the menu and logo, and the signed in user. From 768px up the
 * sidebar holds the system switcher and the account menu; at every size each page's PageHeader
 * holds the breadcrumb (suite spec 0016, Layout and navigation).
 */
export function AppHeader() {
  const sections = useNavSections();

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4 md:hidden">
      {!usesTabBar(sections) && <MobileNavSheet sections={sections} />}
      <BrandMark compact tone="card" />
      <div className="ml-auto">
        <UserMenu />
      </div>
    </header>
  );
}
