import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { anyCount, countName, countText, getNavMatch, hotTotal, type NavItem, type NavSection } from './navItems';
import { useNavOpen } from './useNavOpen';

/*
  Suite spec 0016 AC-16 (design.md, Layout and navigation: Sidebar; board Sidebars8): idle pages
  in sidebar-idle, hover sidebar-hover, the current page sidebar-current with white semibold text.
  No gold edge, no dot. Section labels never fold; a sidebar-line separates sections. Spec 0027:
  only a page with sub pages opens and closes, and its sub pages carry the counts.
*/
export const ITEM_CLASSES =
  'relative flex h-10 w-full items-center gap-3 rounded-md px-2.5 text-body font-medium text-sidebar-idle transition-colors duration-(--duration-menu) outline-none hover:bg-sidebar-hover hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring-on-dark motion-reduce:transition-none';

const CURRENT_CLASSES = 'bg-sidebar-current font-semibold text-sidebar-foreground';

const SUB_ITEM_CLASSES =
  'flex h-8.5 w-full items-center justify-between gap-2 rounded-md px-2.5 text-small font-medium text-sidebar-idle transition-colors duration-(--duration-menu) outline-none hover:bg-sidebar-hover hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring-on-dark motion-reduce:transition-none';

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

/** A mono count bubble (AC-5, AC-6): gold with navy text when hot, else sidebar-count. */
function Bubble({ count, hot, name }: { count: number; hot: boolean; name: string }) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'ml-auto shrink-0 rounded-full px-1.5 font-mono text-caption',
          hot ? 'bg-highlight text-highlight-foreground' : 'bg-sidebar-count text-sidebar-foreground',
        )}
      >
        {countText(count)}
      </span>
      <span className="sr-only">, {name}</span>
    </>
  );
}

/** Collapsed, a bubble becomes an 8px dot on the icon, gold when hot (AC-6). */
function Dot({ hot }: { hot: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn('absolute top-1.5 right-2.5 size-2 rounded-full', hot ? 'bg-highlight' : 'bg-sidebar-idle')}
    />
  );
}

/** What a collapsed or closed parent says about its sub pages' counts, for the tooltip and screen readers. */
function parentCountLabel(item: NavItem) {
  const hot = hotTotal(item);
  return hot > 0 ? `${item.label}, ${hot} waiting on you` : item.label;
}

interface SidebarNavProps {
  sections: NavSection[];
  collapsed?: boolean;
  /** Called after a link is chosen, so the phone sheet can close. */
  onNavigate?: () => void;
  /** Collapsed, choosing a page with sub pages expands the sidebar (design.md, Collapse). */
  onExpand?: () => void;
}

export function SidebarNav({ sections, collapsed = false, onNavigate, onExpand }: SidebarNavProps) {
  const { pathname, search } = useLocation();
  const match = getNavMatch(pathname, search, sections);
  const { isOpen, setOpen } = useNavOpen();

  return (
    <nav aria-label="Main" className="flex flex-col">
      {sections.map((section, index) => (
        <div key={section.title || 'main'} className="flex flex-col gap-0.5">
          {index > 0 && <hr aria-hidden="true" className="mx-2.5 mt-2.5 border-sidebar-line" />}
          {!collapsed && section.title && (
            <h2 className={cn('px-2.5 pb-1.5 text-label text-sidebar-label', index > 0 ? 'pt-3' : 'pt-1')}>
              {section.title}
            </h2>
          )}
          {collapsed && index > 0 && <span aria-hidden="true" className="h-2" />}
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <li key={item.to}>
                {item.children?.length ? (
                  <NavGroup
                    item={item}
                    collapsed={collapsed}
                    current={match?.item === item && !match.child}
                    currentChild={match?.item === item ? match.child : undefined}
                    open={!collapsed && isOpen(item.to)}
                    onOpenChange={(next) => setOpen(item.to, next)}
                    onNavigate={onNavigate}
                    onExpand={onExpand}
                  />
                ) : (
                  <NavLink item={item} collapsed={collapsed} current={match?.item === item} onNavigate={onNavigate} />
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function NavLink({
  item,
  collapsed,
  current,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  current: boolean;
  onNavigate?: () => void;
}) {
  return (
    <CollapsedTooltip label={item.label} collapsed={collapsed}>
      <Link
        to={item.to}
        onClick={onNavigate}
        aria-current={current ? 'page' : undefined}
        className={cn(ITEM_CLASSES, collapsed && 'justify-center px-0', current && CURRENT_CLASSES)}
      >
        <item.icon aria-hidden="true" className="size-4.5 shrink-0" />
        <span className={cn('truncate', collapsed && 'sr-only')}>{item.label}</span>
      </Link>
    </CollapsedTooltip>
  );
}

interface NavGroupProps {
  item: NavItem;
  collapsed: boolean;
  /** The parent itself is current (a ticket, or the plain list), not one of its sub pages. */
  current: boolean;
  currentChild?: NavItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: () => void;
  onExpand?: () => void;
}

/**
 * A page with sub pages (spec 0027, AC-3): the name goes to its first sub page and never folds it;
 * only the chevron opens and closes it. Closed, it shows the sum of its hot counts (AC-5).
 */
function NavGroup({ item, collapsed, current, currentChild, open, onOpenChange, onNavigate, onExpand }: NavGroupProps) {
  const children = item.children ?? [];
  const first = children[0];
  const hot = hotTotal(item);
  const groupId = `nav-group-${item.to.replace(/\W+/g, '-')}`;

  if (collapsed) {
    const label = parentCountLabel(item);
    return (
      <CollapsedTooltip label={label} collapsed>
        <Link
          to={first.to}
          onClick={() => {
            onExpand?.();
            onOpenChange(true);
            onNavigate?.();
          }}
          aria-current={current || currentChild ? 'page' : undefined}
          className={cn(ITEM_CLASSES, 'justify-center px-0', (current || currentChild) && CURRENT_CLASSES)}
        >
          <item.icon aria-hidden="true" className="size-4.5 shrink-0" />
          <span className="sr-only">{label}</span>
          {anyCount(item) && <Dot hot={hot > 0} />}
        </Link>
      </CollapsedTooltip>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div
        className={cn(
          'flex items-center rounded-md transition-colors duration-(--duration-menu) hover:bg-sidebar-hover motion-reduce:transition-none',
          current && 'bg-sidebar-current hover:bg-sidebar-current',
        )}
      >
        <Link
          to={first.to}
          onClick={onNavigate}
          aria-current={current ? 'page' : undefined}
          className={cn(ITEM_CLASSES, 'min-w-0 flex-1 hover:bg-transparent', current && 'font-semibold text-sidebar-foreground')}
        >
          <item.icon aria-hidden="true" className="size-4.5 shrink-0" />
          <span className="truncate">{item.label}</span>
          {!open && hot > 0 && <Bubble count={hot} hot name={`${hot} waiting on you`} />}
        </Link>
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          aria-controls={groupId}
          aria-label={`${open ? 'Close' : 'Open'} ${item.label}`}
          className="flex h-10 w-8 shrink-0 items-center justify-center rounded-md text-sidebar-idle outline-none hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring-on-dark max-md:h-11"
        >
          <ChevronRight
            aria-hidden="true"
            className={cn(
              'size-3.5 transition-transform duration-(--duration-fold) ease-enter motion-reduce:transition-none',
              open && 'rotate-90',
            )}
          />
        </button>
      </div>
      {open && (
        <ul id={groupId} className="mb-1 ml-4.5 flex flex-col gap-0.5 border-l border-sidebar-line pl-3">
          {children.map((child) => {
            const isCurrent = child === currentChild;
            return (
              <li key={child.to}>
                <Link
                  to={child.to}
                  onClick={onNavigate}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={cn(SUB_ITEM_CLASSES, isCurrent && CURRENT_CLASSES)}
                >
                  <span className="truncate">{child.label}</span>
                  {child.countKey && child.count ? (
                    <Bubble count={child.count} hot={child.hot === true} name={countName(child.countKey, child.count)} />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
