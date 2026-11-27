import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { countName, countText, getNavMatch } from '../../../components/layout/navItems';
import { useNavSections } from '../../../components/layout/useNavSections';

/**
 * Spec 0027, AC-11: on phones the sidebar's Repair tickets sub pages are reached from these
 * chips (and the sheet). They are the same sub pages, with the same counts and hot rule.
 */
export function RepairViewChips() {
  const { pathname, search } = useLocation();
  const sections = useNavSections();
  const match = getNavMatch(pathname, search, sections);
  const pages = match?.item.to === '/repairs' ? (match.item.children ?? []) : [];
  if (pages.length === 0) return null;

  return (
    <nav aria-label="Repair lists" className="-mx-4 mb-4 overflow-x-auto px-4 md:hidden">
      <ul className="flex w-max gap-2">
        {pages.map((page) => {
          const current = page === match?.child;
          return (
            <li key={page.to}>
              <Link
                to={page.to}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'flex h-11 items-center gap-2 rounded-full border px-4 text-small font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  current ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground',
                )}
              >
                {page.label}
                {page.countKey && page.count ? (
                  <>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'rounded-full px-1.5 font-mono text-caption',
                        page.hot ? 'bg-highlight text-highlight-foreground' : current ? 'bg-sidebar-count' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {countText(page.count)}
                    </span>
                    <span className="sr-only">, {countName(page.countKey, page.count)}</span>
                  </>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
