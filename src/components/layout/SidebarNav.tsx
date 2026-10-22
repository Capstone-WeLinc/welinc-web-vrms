import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getActiveNavPath, type NavSection } from './navItems';

const ITEM_CLASSES =
  'relative flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/70 transition-colors outline-none hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-primary motion-reduce:transition-none';

// The gold bar on the left edge of the active item (design.md: gold marker plus white text).
const ACTIVE_CLASSES =
  'bg-sidebar-foreground/10 text-sidebar-foreground before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-sidebar-primary';

/** Shows the label as a tooltip on the right while the sidebar is collapsed. */
function CollapsedTooltip({ label, collapsed, children }: { label: string; collapsed: boolean; children: ReactNode }) {
  if (!collapsed) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
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
    <nav aria-label="Main" className="flex flex-col gap-4">
      {sections.map((section, index) => (
        <div key={section.title} className="flex flex-col gap-1">
          {collapsed ? (
            index > 0 && <hr className="mx-2 mb-1 border-sidebar-foreground/10" />
          ) : (
            <h2 className="px-3 pb-1 text-xs font-medium tracking-wide text-sidebar-foreground/60 uppercase">
              {section.title}
            </h2>
          )}
          <ul className="flex flex-col gap-1">
            {section.items.map((item) => {
              const active = item.to === activePath;
              return (
                <li key={item.to}>
                  <CollapsedTooltip label={item.label} collapsed={collapsed}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cn(ITEM_CLASSES, collapsed && 'justify-center px-0', active && ACTIVE_CLASSES)}
                    >
                      <item.icon aria-hidden="true" className="size-5 shrink-0" />
                      <span className={cn('truncate', collapsed && 'sr-only')}>{item.label}</span>
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

/** A button styled like a nav item, for the sidebar footer (switch system, sign out, collapse). */
export function SidebarAction({ icon: Icon, label, onClick, collapsed = false, ...aria }: SidebarActionProps) {
  return (
    <CollapsedTooltip label={label} collapsed={collapsed}>
      <button type="button" onClick={onClick} className={cn(ITEM_CLASSES, collapsed && 'justify-center px-0')} {...aria}>
        <Icon aria-hidden="true" className="size-5 shrink-0" />
        <span className={cn('truncate', collapsed && 'sr-only')}>{label}</span>
      </button>
    </CollapsedTooltip>
  );
}
