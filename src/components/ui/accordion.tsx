import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { Accordion as AccordionPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

// shadcn Accordion, themed for VRMS (spec 0024, AC-1): no border per item (the list divides its
// rows), the token focus ring, and the ease-enter curve. The global reduced motion rule stops it.

function Accordion({ ...props }: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}

function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item data-slot="accordion-item" className={className} {...props} />;
}

/**
 * The whole header is the one button, inside an `h3` (Radix sets `aria-expanded` and `aria-controls`).
 * Spec 0024, AC-7: `actions` (a row menu) sit inside the header after the button, never inside it, and
 * the chevron follows them, outside the button too: hidden from screen readers, a click on it toggles.
 */
function AccordionTrigger({
  className,
  children,
  actions,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger> & { actions?: React.ReactNode }) {
  const trigger = React.useRef<HTMLButtonElement>(null);
  return (
    <AccordionPrimitive.Header className="group/header flex items-start gap-1">
      <AccordionPrimitive.Trigger
        ref={trigger}
        data-slot="accordion-trigger"
        className={cn(
          'group/trigger flex min-w-0 flex-1 items-start justify-between gap-3 rounded-md text-left text-body outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </AccordionPrimitive.Trigger>
      {actions}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => trigger.current?.click()}
        className="flex size-11 shrink-0 items-center justify-center md:mt-2 md:size-8"
      >
        <ChevronDownIcon className="size-4 text-muted-foreground transition-transform duration-(--duration-fold) ease-enter group-data-[state=open]/header:rotate-180" />
      </button>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="overflow-hidden text-body duration-(--duration-fold) ease-enter data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      {...props}
    >
      <div className={cn('pb-4', className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
