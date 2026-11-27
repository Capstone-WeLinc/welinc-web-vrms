import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, User as UserIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SystemSwitcher } from './SidebarAccount';
import { SidebarAction, SidebarNav } from './SidebarNav';
import type { NavSection } from './navItems';
import { useShellActions } from './useShellActions';

/**
 * Phone navigation when the tab bar can't hold every page (below 768px; spec 0027, AC-11): the
 * switcher at the top, the same sections with sub pages and counts, and the account items at the bottom.
 */
export function MobileNavSheet({ sections }: { sections: NavSection[] }) {
  const [open, setOpen] = useState(false);
  const { signOut } = useShellActions();
  const navigate = useNavigate();
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-touch" aria-label="Open menu" className="-ml-2 md:hidden">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-72 gap-0 border-sidebar bg-sidebar text-sidebar-foreground"
      >
        <div className="flex shrink-0 items-center gap-2 pt-3 pr-2 pl-3">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Main navigation</SheetDescription>
          <div className="min-w-0 flex-1">
            <SystemSwitcher />
          </div>
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon-touch"
              aria-label="Close menu"
              className="text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-foreground focus-visible:ring-ring-on-dark focus-visible:ring-offset-sidebar"
            >
              <X />
            </Button>
          </SheetClose>
        </div>
        <hr aria-hidden="true" className="mx-3.5 mt-3.5 border-sidebar-line" />
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <SidebarNav sections={sections} onNavigate={close} />
        </div>
        <div className="flex shrink-0 flex-col gap-1 border-t border-sidebar-line px-3 py-3 pb-safe">
          <SidebarAction
            icon={UserIcon}
            label="Profile"
            onClick={() => {
              close();
              navigate('/profile');
            }}
          />
          <SidebarAction
            icon={LogOut}
            label="Sign out"
            onClick={() => {
              close();
              void signOut();
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
