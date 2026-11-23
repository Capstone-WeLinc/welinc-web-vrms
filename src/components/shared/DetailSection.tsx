import { useId, type ComponentProps, type ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DetailSectionProps extends Omit<ComponentProps<'div'>, 'title' | 'children'> {
  title: string;
  /** Anchor for in page links, such as "Go to costs". */
  id?: string;
  /** One control beside the title, such as "Edit costs". */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** One titled card on the repair detail page. */
export function DetailSection({ title, id, action, className, children, ...rest }: DetailSectionProps) {
  const headingId = useId();
  return (
    <Card {...rest} id={id} role="region" aria-labelledby={headingId} className={cn('scroll-mt-20 gap-4 p-4 md:p-5', className)}>
      <div className="flex min-h-9 items-center justify-between gap-3">
        <h2 id={headingId} tabIndex={-1} className="text-group font-semibold text-foreground outline-none">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

/** A label and value pair inside a section's `<dl>`. */
export function DetailItem({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      <dt className="text-caption font-medium text-muted-foreground">{label}</dt>
      <dd className="text-body break-words text-foreground">{children}</dd>
    </div>
  );
}
