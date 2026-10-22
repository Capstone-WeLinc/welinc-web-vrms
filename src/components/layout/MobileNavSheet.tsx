import { useState } from 'react';
import { ArrowRightLeft, LogOut, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { BrandMark } from './BrandMark';
import { SidebarAction, SidebarNav } from './SidebarNav';
import type { NavSection } from './navItems';
import { useShellActions } from './useShellActions';

/** Phone navigation for admins (below 768px): the full sidebar in a sheet. */
export function MobileNavSheet({ sections }: { sections: NavSection[] }) {
  const [open, setOpen] = useState(false);
  const { canSwitchToVmms, switchToVmms, signOut } = useShellActions();
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
        <div className="flex h-16 shrink-0 items-center justify-between pr-2 pl-5">
          <SheetTitle asChild>
            <div>
              <BrandMark />
            </div>
          </SheetTitle>
          <SheetDescription className="sr-only">Main navigation</SheetDescription>
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon-touch"
              aria-label="Close menu"
              className="text-sidebar-foreground hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
            >
              <X />
            </Button>
          </SheetClose>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav sections={sections} onNavigate={close} />
        </div>
        <div className="flex shrink-0 flex-col gap-1 border-t border-sidebar-foreground/10 px-3 py-3 pb-safe">
          {canSwitchToVmms && <SidebarAction icon={ArrowRightLeft} label="Switch to VMMS" onClick={switchToVmms} />}
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
