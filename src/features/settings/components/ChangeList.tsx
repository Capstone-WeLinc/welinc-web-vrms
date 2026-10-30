import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HistoryChange } from '../../../lib/api/settingsApi';
import { formatDateTime } from '../../../lib/utils/format';
import { actorLabel, changeSides, changeWhat, isLongNote } from '../lib/changes';

/** The note keeps its line breaks; a long one starts at two lines with Show more. */
function ChangeNote({ note }: { note: string }) {
  const [open, setOpen] = useState(false);
  const long = isLongNote(note);
  return (
    <span className="flex flex-col items-start gap-0.5">
      <span className={cn('max-w-full text-xs wrap-anywhere whitespace-pre-line text-muted-strong', long && !open && 'line-clamp-2')}>
        <span className="font-medium">Note:</span> {note}
      </span>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="text-xs font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:underline"
        >
          {open ? 'Show less' : 'Show more'}
        </button>
      )}
    </span>
  );
}

/**
 * Change rows: when, who, what, before and after, and the note (spec 0012, AC-26). `units` adds
 * each value setting's unit to its numbers.
 */
export function ChangeList({ changes, units = {} }: { changes: HistoryChange[]; units?: Record<string, string> }) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {changes.map((change) => {
        const sides = changeSides(change, units[change.key]);
        return (
          <li key={change.id} className="flex flex-col gap-0.5 py-2 text-sm first:pt-0 last:pb-0">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="wrap-break-word text-foreground">{changeWhat(change)}</span>
              <span className="flex items-center gap-1 text-foreground tabular-nums">
                <span className="text-muted-foreground">{sides.before}</span>
                <ArrowRight aria-label="changed to" className="size-3.5 text-muted-foreground" />
                <span className="font-medium">{sides.after}</span>
              </span>
            </span>
            <span className="text-xs wrap-break-word text-muted-foreground">
              {actorLabel(change.actor)} · <time dateTime={change.createdAt}>{formatDateTime(change.createdAt)}</time>
            </span>
            {change.note && <ChangeNote note={change.note} />}
          </li>
        );
      })}
    </ul>
  );
}
