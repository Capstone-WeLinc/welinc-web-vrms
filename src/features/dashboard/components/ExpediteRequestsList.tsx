import { Link } from 'react-router-dom';
import { formatDateTime, formatRelativeTime } from '../../../lib/utils/format';
import type { ExpediteRequest } from '../../../types';
import { neededByDay } from '../../repair/lib/expedite';

/** Spec 0029 (child 0003), AC-18: BMS's waiting expedite requests, each linked to its ticket. */
export function ExpediteRequestsList({ items, total, now }: { items: ExpediteRequest[]; total: number; now: number }) {
  return (
    <section id="expedite-requests" aria-labelledby="expedite-heading" className="flex scroll-mt-20 flex-col gap-3">
      <div>
        <h2 id="expedite-heading" className="text-subheading font-semibold text-foreground">
          Expedite requests
        </h2>
        <p className="text-body text-muted-foreground">BMS asks to speed up these repairs. Open the ticket to accept or decline.</p>
      </div>
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
        {items.map((request) => {
          const neededBy = neededByDay(request.neededBy);
          return (
            <li key={request.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-body">
                  <Link to={`/repairs/${request.repairTicketId}`} className="font-mono font-medium text-foreground underline-offset-2 hover:underline">
                    {request.repairNumber}
                  </Link>
                  <span className="text-muted-foreground">, {request.vehiclePlate}, for </span>
                  <span className="font-mono">{request.jobOrderNumber}</span>
                </p>
                <p className="line-clamp-2 text-body text-muted-strong break-words">{request.reason}</p>
              </div>
              <div className="flex shrink-0 flex-col text-caption text-muted-foreground sm:items-end">
                {neededBy && <span>Needed by {neededBy}</span>}
                <span title={formatDateTime(request.receivedAt)}>Received {formatRelativeTime(request.receivedAt, new Date(now))}</span>
              </div>
            </li>
          );
        })}
      </ul>
      {total > items.length && (
        <p className="text-caption text-muted-foreground">Showing the oldest {items.length} of {total}.</p>
      )}
    </section>
  );
}
