import { useId, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FoldCardProps {
  title: string;
  /** The one line shown beside the title, open or closed. */
  summary: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** An action that sits on the line, outside the fold button (Retry, Run). */
  lineAction?: ReactNode;
  /** False shows the line with no button or chevron (nothing to open). */
  foldable?: boolean;
  /** Extra classes for the panel; children stay mounted only while open. */
  panelClassName?: string;
  children?: ReactNode;
}

/**
 * Spec 0024, AC-14 and AC-15: a card folded to one line. The heading holds one button
 * (`aria-expanded`, `aria-controls`) with the title, the summary and the chevron, so the summary must
 * render no link or other control. The owner keeps its own data and fetch, so folding never unmounts it.
 */
export function FoldCard({ title, summary, open, onOpenChange, lineAction, foldable = true, panelClassName, children }: FoldCardProps) {
  const headingId = useId();
  const panelId = useId();
  const line = (
    <>
      <span className="shrink-0">{title}</span>
      <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-normal">
        <span className="min-w-0 truncate">{summary}</span>
        {foldable && (
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-snappy motion-reduce:transition-none',
              open && 'rotate-180',
            )}
          />
        )}
      </span>
    </>
  );
  return (
    <Card role="region" aria-labelledby={headingId} className="gap-0 px-4 py-2 md:px-5">
      <div className="flex items-center justify-between gap-2">
        <h2 id={headingId} className="min-w-0 flex-1 text-base font-semibold text-foreground">
          {foldable ? (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => onOpenChange(!open)}
              className="flex min-h-11 w-full min-w-0 items-center gap-x-2 rounded-md py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {line}
            </button>
          ) : (
            <span className="flex min-h-11 w-full min-w-0 items-center gap-x-2 py-1">{line}</span>
          )}
        </h2>
        {lineAction}
      </div>
      {foldable && (
        <div id={panelId} hidden={!open} className={cn('pt-2 pb-3', panelClassName)}>
          {open && children}
        </div>
      )}
    </Card>
  );
}
