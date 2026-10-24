import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type KpiTone = 'default' | 'success' | 'destructive' | 'highlight';

interface KpiCardProps {
  caption: string;
  value: ReactNode;
  icon: LucideIcon;
  /** One line under the value, such as "4 more than last week". */
  context?: ReactNode;
  tone?: KpiTone;
  /** Makes the whole card one toggle button, such as a filter tile. Its name is "{caption}, {value}". */
  onSelect?: () => void;
  /** The pressed state of a card with onSelect. */
  selected?: boolean;
}

const TONE_CLASSES: Record<KpiTone, string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  destructive: 'bg-destructive/10 text-destructive',
  highlight: 'bg-highlight/10 text-highlight',
};

const LAYOUT = 'flex-row items-start justify-between gap-4 p-5';

export function KpiCard({ caption, value, icon: Icon, context, tone = 'default', onSelect, selected = false }: KpiCardProps) {
  const body = (
    <>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-medium text-muted-foreground">{caption}</p>
        <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
        {context && <p className="text-xs text-muted-foreground">{context}</p>}
      </div>
      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', TONE_CLASSES[tone])}>
        <Icon aria-hidden="true" className="size-5" />
      </div>
    </>
  );

  if (!onSelect) return <Card className={LAYOUT}>{body}</Card>;

  return (
    // Card's own surface on a button, so the whole tile is one toggle.
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'flex min-h-11 w-full rounded-xl border bg-card text-left text-card-foreground shadow-xs transition-colors outline-none hover:bg-muted/50',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        LAYOUT,
        selected && 'ring-2 ring-ring',
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
