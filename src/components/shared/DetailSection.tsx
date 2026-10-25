import { useId, type ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DetailSectionProps {
  title: string;
  /** Anchor for in page links, such as "Go to costs". */
  id?: string;
  /** One control beside the title, such as "Edit costs". */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** One titled card on the repair detail page. */
export function DetailSection({ title, id, action, className, children }: DetailSectionProps) {
  const headingId = useId();
  return (
    <Card id={id} role="region" aria-labelledby={headingId} className={cn('scroll-mt-20 gap-4 p-4 md:p-5', className)}>
      <div className="flex min-h-9 items-center justify-between gap-3">
        <h2 id={headingId} tabIndex={-1} className="text-base font-semibold text-foreground outline-none">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

/** A label and value pair inside a section's `<dl>`. */
export function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words text-foreground">{children}</dd>
    </div>
  );
}
