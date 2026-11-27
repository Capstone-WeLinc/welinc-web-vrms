import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SidebarFooter } from './SidebarFooter';
import { SidebarNav } from './SidebarNav';
import { SidebarTitle } from './SidebarTitle';
import type { NavSection } from './navItems';

/**
 * Phone navigation when the tab bar can't hold every page (below 768px; spec 0027, AC-11): the
 * VRMS title at the top, the same sections with sub pages and counts, and the footer strip with
 * no collapse button. Your profile and Sign out stay in the top bar's avatar.
 */
export function MobileNavSheet({ sections }: { sections: NavSection[] }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className="-ml-2 flex size-11 items-center justify-center rounded-lg text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-72 gap-0 border-sidebar bg-sidebar text-sidebar-foreground"
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Main navigation</SheetDescription>
        <div className="flex shrink-0 items-center gap-2 pt-3 pr-2 pl-3">
          <div className="min-w-0 flex-1">
            <SidebarTitle onNavigate={close} />
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
        <div className="pb-safe">
          <SidebarFooter />
        </div>
      </SheetContent>
    </Sheet>
  );
}
