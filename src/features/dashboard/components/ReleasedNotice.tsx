import { Link } from 'react-router-dom';
import { Callout } from '../../../components/shared/Callout';
import { PlateChip } from '../../../components/shared/PlateChip';
import { statusLabel } from '../../../components/shared/statusLabels';
import type { ReleasedTicket } from '../../../lib/api/vrmsConfigApi';
import { leaverLine, releasedAgo } from '../lib/released';

/**
 * Suite spec 0013, AC-32: tickets VRMS took off a mechanic in the last 7 days because their
 * account was deleted, deactivated or lost its VRMS role, so nothing waits on someone who is gone.
 * Each row opens the ticket. Hidden when the list is empty.
 */
export function ReleasedNotice({ rows, now }: { rows: ReleasedTicket[]; now: number }) {
  if (rows.length === 0) return null;
  return (
    <Callout tone="warning" title="Released after account changes">
      <p className="text-muted-foreground">
        {rows.length === 1
          ? 'This ticket lost its mechanic in the last 7 days. Check that someone has picked it up.'
          : `These ${rows.length} tickets lost a mechanic in the last 7 days. Check that someone has picked them up.`}
      </p>
      <ul aria-label="Released tickets, newest first" className="-mx-2 mt-2 flex flex-col">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              to={`/repairs/${row.ticketId}`}
              title={row.repairNumber}
              className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-2 py-1.5 outline-none transition-colors duration-150 hover:bg-highlight/20 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none md:min-h-9"
            >
              <PlateChip plate={row.plateNumber} />
              <span className="min-w-0 flex-1 truncate text-foreground">{leaverLine(row.person, row.reason)}</span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                Now {statusLabel(row.repairStatus)}, {releasedAgo(row.releasedAt, now)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Callout>
  );
}
