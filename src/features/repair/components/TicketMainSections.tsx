import type { RepairTicket } from '../../../types';
import { Callout } from '../../../components/shared/Callout';
import { DetailItem, DetailSection } from '../../../components/shared/DetailSection';

/** Cancellation and failed verification reasons, then the latest remark. Renders nothing when there are none. */
export function NotesSection({ ticket }: { ticket: RepairTicket }) {
  if (!ticket.cancellationReason && !ticket.failedVerificationReason && !ticket.remarks) return null;
  return (
    <DetailSection title="Notes">
      {ticket.cancellationReason && (
        <Callout tone="destructive" title="Cancellation reason">
          {ticket.cancellationReason}
        </Callout>
      )}
      {ticket.failedVerificationReason && (
        <Callout tone="destructive" title="Failed verification reason">
          {ticket.failedVerificationReason}
        </Callout>
      )}
      {ticket.remarks && (
        <dl>
          <DetailItem label="Latest remark">{ticket.remarks}</DetailItem>
        </dl>
      )}
    </DetailSection>
  );
}

export function VehicleSection({ ticket }: { ticket: RepairTicket }) {
  return (
    <DetailSection title="Vehicle">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <DetailItem label="Plate">{ticket.vehiclePlate}</DetailItem>
        <DetailItem label="Model">{ticket.vehicleModel || '—'}</DetailItem>
        <DetailItem label="Odometer">
          {ticket.odometerReading != null ? <span className="tabular-nums">{ticket.odometerReading.toLocaleString('en-US')} km</span> : '—'}
        </DetailItem>
      </dl>
    </DetailSection>
  );
}

export function IssuesSection({ ticket }: { ticket: RepairTicket }) {
  const issues = ticket.issues ?? [];
  return (
    <DetailSection title="Issues">
      {issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">No issues logged.</p>
      ) : (
        <ol className="flex flex-col divide-y divide-border">
          {issues.map((issue, index) => (
            <li key={issue.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-strong tabular-nums"
              >
                {index + 1}
              </span>
              <p className="min-w-0 text-sm break-words text-foreground">
                <span className="sr-only">Issue {index + 1}: </span>
                {issue.description}
              </p>
            </li>
          ))}
        </ol>
      )}
    </DetailSection>
  );
}
