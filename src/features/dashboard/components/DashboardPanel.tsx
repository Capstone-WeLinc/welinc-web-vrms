import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PanelProps = {
  id: string;
  title: string;
  /** Shown after the title, inside the heading (spec 0022, AC-7). */
  count?: number;
  /** Right side of the header, such as "See all". */
  action?: ReactNode;
  /** The No mechanic group: the title in the destructive color. */
  danger?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * One dashboard section as a panel: a plain title row on a hairline, then the rows edge to edge,
 * so the rows carry the panel rather than decoration does.
 */
export function DashboardPanel({ id, title, count, action, danger = false, children, className }: PanelProps) {
  return (
    <section aria-labelledby={id} className={cn('flex flex-col overflow-hidden rounded-xl border border-border bg-card', className)}>
      <header className="flex min-h-12 items-center gap-3 border-b border-border px-4 py-2 md:px-5">
        <h2
          id={id}
          className={cn('flex min-w-0 flex-1 items-baseline gap-2 text-sm font-semibold', danger ? 'text-destructive' : 'text-foreground')}
        >
          <span className="min-w-0">{title}</span>
          {count !== undefined && <span className="font-normal text-muted-foreground tabular-nums">{count}</span>}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

/** A panel's one line empty state (spec 0022, AC-9). */
export function PanelEmpty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-6 text-sm text-muted-foreground md:px-5">{children}</p>;
}
