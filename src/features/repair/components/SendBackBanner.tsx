import { Callout } from '../../../components/shared/Callout';
import { formatDateTime, formatRelativeTime } from '../../../lib/utils/format';
import type { TicketRejection } from '../../../types';

interface SendBackBannerProps {
  rejection: TicketRejection;
  /** When the ticket loaded, so the relative time matches the rest of the page. */
  now: number;
}

/** Spec 0014, AC-17: why the work came back, near the top of the ticket. */
export function SendBackBanner({ rejection, now }: SendBackBannerProps) {
  return (
    <Callout
      tone="warning"
      className="mb-4"
      title={`Sent back by ${rejection.byName}, ${formatRelativeTime(rejection.at, new Date(now))}`}
    >
      <p className="whitespace-pre-line">{rejection.remarks}</p>
      <p className="mt-1 text-xs text-muted-strong">
        <time dateTime={rejection.at}>{formatDateTime(rejection.at)}</time>
      </p>
    </Callout>
  );
}
