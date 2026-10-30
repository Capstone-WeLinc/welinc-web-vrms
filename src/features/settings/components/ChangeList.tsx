import { ArrowRight } from 'lucide-react';
import type { HistoryChange } from '../../../lib/api/settingsApi';
import { formatDateTime } from '../../../lib/utils/format';
import { actorLabel, changeSides, changeWhat } from '../lib/changes';

/** Change rows: when, who, what, before and after, and the note (spec 0012, AC-26). */
export function ChangeList({ changes }: { changes: HistoryChange[] }) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {changes.map((change) => {
        const sides = changeSides(change);
        return (
          <li key={change.id} className="flex flex-col gap-0.5 py-2 text-sm">
            <span className="break-words text-foreground">{changeWhat(change)}</span>
            <span className="flex flex-wrap items-center gap-1 text-foreground">
              <span className="text-muted-foreground">{sides.before}</span>
              <ArrowRight aria-label="changed to" className="size-3.5 text-muted-foreground" />
              <span className="font-medium">{sides.after}</span>
            </span>
            <span className="text-xs break-words text-muted-foreground">
              {actorLabel(change.actor)} · <time dateTime={change.createdAt}>{formatDateTime(change.createdAt)}</time>
              {change.note && ` · “${change.note}”`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
