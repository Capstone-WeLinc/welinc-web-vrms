import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { KpiCard } from '../../../components/shared/KpiCard';
import { formatPeso } from '../../../lib/utils/format';
import type { RepairHistorySummary } from '../../../types';

interface HistorySummaryProps {
  /** Null while loading. */
  summary: RepairHistorySummary | null;
  /** Admins see Total spend; mechanics never get it from the API. */
  showSpend: boolean;
}

// Totals cover every row that matches the filters, not just the page on screen.
export function HistorySummary({ summary, showSpend }: HistorySummaryProps) {
  const count = showSpend ? 4 : 3;
  const grid = cn('grid grid-cols-2 gap-4', showSpend ? 'lg:grid-cols-4' : 'lg:grid-cols-3');

  if (!summary) {
    return (
      <div className={grid} aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <Card key={index} className="gap-3 p-5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-16" />
          </Card>
        ))}
      </div>
    );
  }

  // On phones a peso total can't fit a half width tile, so Finished and Total spend take
  // the full row with Closed and Cancelled paired between them. Mechanics (three
  // tiles) keep that shape until the row of three fits at 1024px.
  return (
    <section aria-label="Totals for these filters" className={grid}>
      <div className={cn('col-span-2 *:h-full', showSpend ? 'sm:col-span-1' : 'lg:col-span-1')}>
        <KpiCard caption="Finished" value={summary.finished.toLocaleString('en-US')} />
      </div>
      <KpiCard caption="Closed" value={summary.closed.toLocaleString('en-US')} />
      <KpiCard caption="Cancelled" value={summary.cancelled.toLocaleString('en-US')} />
      {showSpend && summary.spend !== null && (
        <div className="col-span-2 *:h-full sm:col-span-1">
          <KpiCard caption="Total spend" value={formatPeso(summary.spend)} />
        </div>
      )}
    </section>
  );
}
