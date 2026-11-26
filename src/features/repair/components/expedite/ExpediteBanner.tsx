import { Button } from '@/components/ui/button';
import { Callout } from '../../../../components/shared/Callout';
import { formatDateTime, formatRelativeTime } from '../../../../lib/utils/format';
import type { ExpediteRequest } from '../../../../types';
import { expediteTitle, neededByDay } from '../../lib/expedite';

interface ExpediteBannerProps {
  requests: ExpediteRequest[];
  /** When the ticket loaded, for "Received 5 minutes ago". */
  now: number;
  /** Null for someone without `integration.respond`: they see the requests, not the buttons. */
  onAccept: ((request: ExpediteRequest) => void) | null;
  onDecline: ((request: ExpediteRequest) => void) | null;
}

/** Spec 0029 (child 0003), AC-18: BMS's waiting requests to hurry this repair, one row per Job Order. */
export function ExpediteBanner({ requests, now, onAccept, onDecline }: ExpediteBannerProps) {
  if (requests.length === 0) return null;
  return (
    <Callout tone="info" title={expediteTitle(requests.length)} className="mb-4">
      <ul className="mt-1 flex flex-col divide-y divide-border">
        {requests.map((request) => {
          const neededBy = neededByDay(request.neededBy);
          return (
            <li key={request.id} className="flex flex-col gap-2 py-2 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-body">
                  <span className="font-mono font-medium">{request.jobOrderNumber}</span>
                  {neededBy && <span className="text-muted-foreground">, needed by {neededBy}</span>}
                </p>
                <p className="text-body break-words">{request.reason}</p>
                <p className="text-caption text-muted-foreground" title={formatDateTime(request.receivedAt)}>
                  Received {formatRelativeTime(request.receivedAt, new Date(now))}
                </p>
              </div>
              {onAccept && onDecline && (
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" className="min-h-11 md:min-h-0" onClick={() => onAccept(request)}>
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" className="min-h-11 md:min-h-0" onClick={() => onDecline(request)}>
                    Decline
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Callout>
  );
}
