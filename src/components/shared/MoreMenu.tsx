import { type ReactNode, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface MoreMenuProps {
  /** The trigger's accessible name, such as "More actions for issue 2". */
  label: string;
  /** Size and spacing for the ⋮ button where it sits. */
  triggerClassName?: string;
  /** The menu's items. */
  children: ReactNode;
}

/**
 * A ⋮ button with a "More actions" tooltip and a dropdown menu. When the menu closes, focus returns to
 * the button; that focus must not reopen the tooltip, so it stays quiet until the pointer moves over the
 * button again or focus leaves it.
 */
export function MoreMenu({ label, triggerClassName, children }: MoreMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const quiet = useRef(false);
  return (
    <DropdownMenu
      open={menuOpen}
      onOpenChange={(open) => {
        setMenuOpen(open);
        setTipOpen(false);
        if (!open) quiet.current = true;
      }}
    >
      <Tooltip
        open={tipOpen && !menuOpen}
        onOpenChange={(open) => {
          if (open && quiet.current) return;
          setTipOpen(open);
        }}
      >
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn('shrink-0 text-muted-strong', triggerClassName)}
              aria-label={label}
              // These run before the tooltip's own handlers, so a real hover or a fresh focus shows it again
              onPointerMove={() => {
                quiet.current = false;
              }}
              onBlur={() => {
                quiet.current = false;
              }}
            >
              <MoreVertical aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>More actions</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="min-w-44">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
