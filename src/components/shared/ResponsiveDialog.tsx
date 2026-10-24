import { useRef, type ReactNode, type RefObject } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/useIsMobile';

type ResponsiveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** The actions. Stays visible while the body scrolls. */
  footer?: ReactNode;
  /** Focus goes here on close when it is mounted, instead of back to the opener. */
  finalFocusRef?: RefObject<HTMLElement | null>;
};

/** A centered dialog from 768px up, a bottom sheet on phones. Same props either way. */
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  finalFocusRef,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();
  // Controlled without a trigger, so remember who opened it and hand focus back on close.
  const openerRef = useRef<HTMLElement | null>(null);
  const focusProps = {
    onOpenAutoFocus: () => {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    },
    onCloseAutoFocus: (event: Event) => {
      event.preventDefault();
      const target = finalFocusRef?.current?.isConnected ? finalFocusRef.current : openerRef.current;
      if (target?.isConnected) target.focus();
    },
  };

  // Focusable so keyboard users can scroll a long body that has no controls of its own.
  const body = (
    <div
      tabIndex={0}
      role="region"
      aria-label={title}
      className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset md:px-6"
    >
      {children}
    </div>
  );
  const footerBar = footer && (
    <div className="flex flex-col-reverse gap-2 border-t border-border p-4 md:flex-row md:justify-end md:px-6">{footer}</div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-11/12 gap-0" {...focusProps}>
          <SheetHeader className="pr-16">
            <SheetTitle className="text-xl">{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          {body}
          {footerBar}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-11/12 flex-col gap-0 p-0" {...focusProps}>
        <DialogHeader className="p-6 pr-16 pb-4 text-left">
          <DialogTitle className="text-xl">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {body}
        {footerBar}
      </DialogContent>
    </Dialog>
  );
}
