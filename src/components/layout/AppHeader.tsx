import { useLocation } from 'react-router-dom';
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BrandMark } from './BrandMark';
import { MobileNavSheet } from './MobileNavSheet';
import { UserMenu } from './UserMenu';
import { getActiveNavTrail, getNavSections } from './navItems';

interface AppHeaderProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

/**
 * Top bar of the content column. Left: the sidebar toggle (desktop) or menu and logo (phone),
 * then where you are. Right: the signed in user and their role badge.
 */
export function AppHeader({ sidebarCollapsed, onToggleSidebar }: AppHeaderProps) {
  const role = useAuthStore((state) => state.user?.role);
  const { pathname } = useLocation();
  const sections = getNavSections(role);
  const trail = getActiveNavTrail(pathname, sections);
  const toggleLabel = sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar';

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4 md:px-8 xl:px-12">
      {role === 'ADMIN' && <MobileNavSheet sections={sections} />}
      <div className="md:hidden">
        <BrandMark compact tone="card" />
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            aria-label={toggleLabel}
            aria-expanded={!sidebarCollapsed}
            className="-ml-2 hidden text-muted-foreground md:inline-flex"
          >
            {sidebarCollapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{toggleLabel}</TooltipContent>
      </Tooltip>

      {trail && (
        <>
          <div aria-hidden="true" className="hidden h-6 w-px bg-border md:block" />
          <nav aria-label="Breadcrumb" className="hidden min-w-0 sm:block">
            <ol className="flex items-center gap-2 text-sm">
              <li className="hidden text-muted-foreground md:block">{trail.section.title}</li>
              <li aria-hidden="true" className="hidden md:block">
                <ChevronRight className="size-4 text-muted-foreground" />
              </li>
              <li aria-current="page" className="truncate font-medium text-foreground">
                {trail.item.label}
              </li>
            </ol>
          </nav>
        </>
      )}

      <div className="ml-auto">
        <UserMenu />
      </div>
    </header>
  );
}
