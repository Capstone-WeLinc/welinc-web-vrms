import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  caption: string;
  value: ReactNode;
  /** One line under the value, such as "4 more than last week". */
  context?: ReactNode;
  /** Makes the whole card one toggle button, such as a filter tile. Its name is "{caption}, {value}". */
  onSelect?: () => void;
  /** The pressed state of a card with onSelect. */
  selected?: boolean;
}

/*
  A summary number with no list to link to (a total, or a filter tile on its own page). It shares
  StatCard's look (suite spec 0016 AC-14, AC-18): an uppercase label, a large mono number and one
  context line, no icon square. A number that has a list behind it uses StatCard instead.
*/
const SURFACE =
  'flex min-w-0 flex-col gap-2 rounded-2xl border border-transparent bg-card p-4 text-left text-card-foreground shadow-card md:p-5';

export function KpiCard({ caption, value, context, onSelect, selected = false }: KpiCardProps) {
  const body = (
    <>
      <span className="text-label text-muted-strong">{caption}</span>
      <span className="font-mono text-display font-semibold text-foreground">{value}</span>
      {context && <span className="text-small text-muted-foreground">{context}</span>}
    </>
  );

  if (!onSelect) return <div className={SURFACE}>{body}</div>;

  return (
    // The card's own surface on a button, so the whole tile is one toggle.
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        SURFACE,
        'min-h-11 w-full transition-shadow duration-(--duration-menu) ease-enter outline-none hover:shadow-pop motion-reduce:transition-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        selected && 'ring-2 ring-primary',
      )}
    >
      {/* The name is "{caption}, {value}" from text, not aria-label, so it never mismatches what is shown. */}
      <span className="sr-only">
        {caption}, {value}
      </span>
      <span aria-hidden="true" className="contents">
        {body}
      </span>
    </button>
  );
}
