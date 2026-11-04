import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** The icon square's colors, from the status badge families so a panel reads like its rows. */
const TONES = {
  verification: 'bg-status-for-verification-bg text-status-for-verification-fg',
  progress: 'bg-status-in-progress-bg text-status-in-progress-fg',
  primary: 'bg-primary/10 text-primary',
  danger: 'bg-destructive/10 text-destructive',
} as const;

type PanelProps = {
  id: string;
  title: string;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  /** Shown as a number next to the title, inside the heading (spec 0022, AC-7). */
  count?: number;
  /** Right side of the header, such as "See all". */
  action?: ReactNode;
  /** Under the title row, such as the Team summary strip. */
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * One dashboard section as a panel: an icon square in the KpiCard style, the title and its count,
 * then the body edge to edge so rows sit on dividers, not cards inside a card.
 */
export function DashboardPanel({ id, title, icon: Icon, tone, count, action, meta, children, className }: PanelProps) {
  return (
    <section
      aria-labelledby={id}
      className={cn('flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs', className)}
    >
      <header className="flex flex-col gap-3 border-b border-border px-4 py-3.5 md:px-5">
        <div className="flex items-center gap-3">
          <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', TONES[tone])}>
            <Icon aria-hidden="true" className="size-4.5" />
          </span>
          <h2 id={id} className="flex min-w-0 flex-1 items-center gap-2 text-base font-semibold text-foreground">
            <span className="min-w-0">{title}</span>
            {count !== undefined && (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-muted px-1.5 text-sm font-semibold text-foreground tabular-nums">
                {count}
              </span>
            )}
          </h2>
          {action}
        </div>
        {meta}
      </header>
      {children}
    </section>
  );
}

/** A panel's one line empty state (spec 0022, AC-9). */
export function PanelEmpty({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground md:px-5">
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {children}
    </p>
  );
}
