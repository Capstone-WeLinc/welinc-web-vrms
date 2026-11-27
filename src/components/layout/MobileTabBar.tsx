import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getActiveNavPath, type NavItem } from './navItems';

/** Phone navigation when every top level page plus Account fits in 5 tabs (below 768px; spec 0027, AC-11). */
export function MobileTabBar({ items }: { items: NavItem[] }) {
  const { pathname } = useLocation();
  const activePath = getActiveNavPath(pathname, items);

  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-safe md:hidden">
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const active = item.to === activePath;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-16 flex-col items-center justify-center gap-1 text-caption font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  active
                    ? 'text-primary before:absolute before:inset-x-4 before:top-0 before:h-1 before:rounded-b-full before:bg-primary'
                    : 'text-muted-foreground',
                )}
              >
                <item.icon aria-hidden="true" className="size-6" />
                <span className="max-w-full truncate px-1">{item.shortLabel ?? item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
