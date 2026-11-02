import type { ReactNode } from 'react';
import { BadgeCheck, CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RepairTicket } from '../../../types';
import { Callout } from '../../../components/shared/Callout';
import { DetailItem, DetailSection } from '../../../components/shared/DetailSection';
import { PriorityBadge } from '../../../components/shared/PriorityBadge';

/** The cancellation reason, then the latest remark. Renders nothing when there are none. */
export function NotesSection({ ticket }: { ticket: RepairTicket }) {
  if (!ticket.cancellationReason && !ticket.remarks) return null;
  return (
    <DetailSection title="Notes">
      {ticket.cancellationReason && (
        <Callout tone="destructive" title="Cancellation reason">
          {ticket.cancellationReason}
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

function DriverValue({ ticket }: { ticket: RepairTicket }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      {ticket.driverName}
      {/* Sent with the cost record only (ticket.costs.view) */}
      {ticket.driverIsVerified != null && (
        <span
          className={cn('inline-flex items-center gap-1 text-xs font-medium', ticket.driverIsVerified ? 'text-success' : 'text-muted-foreground')}
        >
          {ticket.driverIsVerified ? <BadgeCheck aria-hidden="true" className="size-3.5" /> : <CircleAlert aria-hidden="true" className="size-3.5" />}
          {ticket.driverIsVerified ? 'Verified' : 'Not verified'}
        </span>
      )}
    </span>
  );
}

/** Spec 0019, AC-20: the block the details Edit dialog fixes, with its Edit button as `action`. */
export function VehicleSection({ ticket, action }: { ticket: RepairTicket; action?: ReactNode }) {
  return (
    <DetailSection title="Vehicle & driver" action={action}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <DetailItem label="Plate">{ticket.vehiclePlate}</DetailItem>
        <DetailItem label="Model">{ticket.vehicleModel || '—'}</DetailItem>
        <DetailItem label="Odometer">
          {ticket.odometerReading != null ? <span className="tabular-nums">{ticket.odometerReading.toLocaleString('en-US')} km</span> : '—'}
        </DetailItem>
        <DetailItem label="Driver">
          <DriverValue ticket={ticket} />
        </DetailItem>
        <DetailItem label="Priority">{ticket.priority ? <PriorityBadge priority={ticket.priority} /> : '—'}</DetailItem>
        {ticket.accountType && (
          <DetailItem label="Account">
            {ticket.accountType === 'CORPORATE' ? `Corporate${ticket.corporation ? ` · ${ticket.corporation}` : ''}` : 'Online'}
          </DetailItem>
        )}
      </dl>
    </DetailSection>
  );
}
