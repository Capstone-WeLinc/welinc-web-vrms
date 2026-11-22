import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getActiveNavPath, type NavItem, type NavSection } from './navItems';

/*
  Suite spec 0016 AC-16 (design.md, Layout and navigation: Sidebar; board Sidebars8): idle pages
  in sidebar-idle, hover sidebar-hover, the current page sidebar-current with white semibold text.
  No gold edge, no dot. Section labels never fold; a sidebar-line separates sections.
*/
export const ITEM_CLASSES =
  'relative flex h-10 w-full items-center gap-3 rounded-md px-2.5 text-body font-medium text-sidebar-idle transition-colors duration-(--duration-menu) outline-none hover:bg-sidebar-hover hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring-on-dark motion-reduce:transition-none';

const CURRENT_CLASSES = 'bg-sidebar-current font-semibold text-sidebar-foreground';

/** Shows the label as a tooltip on the right while the sidebar is collapsed. */
export function CollapsedTooltip({ label, collapsed, children }: { label: string; collapsed: boolean; children: ReactNode }) {
  if (!collapsed) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

/** A count bubble: mono, sidebar-count, gold with navy text when hot. Collapsed it is an 8px dot. */
function NavCount({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  if (!item.count) return null;
  const hot = item.hot === true;
  if (collapsed) {
    return (
      <span
        aria-hidden="true"
        className={cn('absolute top-1.5 right-2.5 size-2 rounded-full', hot ? 'bg-highlight' : 'bg-sidebar-idle')}
      />
    );
  }
  return (
    <span
      className={cn(
        'ml-auto shrink-0 rounded-full px-1.5 font-mono text-caption',
        hot ? 'bg-highlight text-highlight-foreground' : 'bg-sidebar-count text-sidebar-foreground',
      )}
    >
      {item.count}
    </span>
  );
}

interface SidebarNavProps {
  sections: NavSection[];
  collapsed?: boolean;
  /** Called after a link is chosen, so the phone sheet can close. */
  onNavigate?: () => void;
}

export function SidebarNav({ sections, collapsed = false, onNavigate }: SidebarNavProps) {
  const { pathname } = useLocation();
  const activePath = getActiveNavPath(pathname, sections.flatMap((section) => section.items));

  return (
    <nav aria-label="Main" className="flex flex-col">
      {sections.map((section, index) => (
        <div key={section.title} className="flex flex-col gap-0.5">
          {index > 0 && <hr aria-hidden="true" className="mx-2.5 mt-2.5 border-sidebar-line" />}
          {!collapsed && (
            <h2 className={cn('px-2.5 pb-1.5 text-label text-sidebar-label', index > 0 ? 'pt-3' : 'pt-1')}>
              {section.title}
            </h2>
          )}
          {collapsed && index > 0 && <span aria-hidden="true" className="h-2" />}
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const current = item.to === activePath;
              const label = item.count ? `${item.label}, ${item.count}${item.hot ? ', needs you' : ''}` : item.label;
              return (
                <li key={item.to}>
                  <CollapsedTooltip label={label} collapsed={collapsed}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      aria-current={current ? 'page' : undefined}
                      className={cn(ITEM_CLASSES, collapsed && 'justify-center px-0', current && CURRENT_CLASSES)}
                    >
                      <item.icon aria-hidden="true" className="size-4.5 shrink-0" />
                      <span className={cn('truncate', collapsed && 'sr-only')}>{collapsed ? label : item.label}</span>
                      <NavCount item={item} collapsed={collapsed} />
                    </Link>
                  </CollapsedTooltip>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

interface SidebarActionProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  collapsed?: boolean;
  'aria-expanded'?: boolean;
}

/** A button styled like a nav item, for the sidebar footer and the phone sheet. */
export function SidebarAction({ icon: Icon, label, onClick, collapsed = false, ...aria }: SidebarActionProps) {
  return (
    <CollapsedTooltip label={label} collapsed={collapsed}>
      <button type="button" onClick={onClick} className={cn(ITEM_CLASSES, collapsed && 'justify-center px-0')} {...aria}>
        <Icon aria-hidden="true" className="size-4.5 shrink-0" />
        <span className={cn('truncate', collapsed && 'sr-only')}>{label}</span>
      </button>
    </CollapsedTooltip>
  );
}
