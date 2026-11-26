import { Callout } from '../../../components/shared/Callout';
import { FromVmmsChip } from '../../../components/shared/FromVmmsChip';
import { PlateChip } from '../../../components/shared/PlateChip';
import type { RepairTicket } from '../../../types';
import { issueDisplayText, stripSystem } from '../lib/issueRow';

/**
 * Spec 0024, AC-11 (`docs/context/vrms/design.md`, Naming a ticket): the plate leads, then the model,
 * then the main issue; the ticket ID sits alone below, never breaking. The garage is in Details (Record).
 */
export function TicketHeader({ ticket }: { ticket: RepairTicket }) {
  const first = ticket.issues?.[0];
  return (
    <header className="mb-4 flex flex-col gap-1.5 border-b border-border pb-4 md:mb-6">
      <h1 className="flex min-w-0 flex-col gap-1.5 text-foreground">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <PlateChip plate={ticket.vehiclePlate} />
          {ticket.vehicleModel && <span className="text-body font-medium text-muted-strong">{ticket.vehicleModel}</span>}
        </span>
        {first && <span className="line-clamp-1 text-heading font-semibold break-words md:text-title">{issueDisplayText(stripSystem(first.description))}</span>}
      </h1>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body text-muted-foreground tabular-nums">
        <span className="whitespace-nowrap">{ticket.repairNumber}</span>
        {/* Spec 0029, AC-12 */}
        {ticket.fromVmmsWorkOrder && <FromVmmsChip workOrderNumber={ticket.fromVmmsWorkOrder} />}
      </p>
      {/* Spec 0029, AC-35: worked out by the server on every read, so it clears on the next sync */}
      {ticket.truckRemoved && (
        <Callout tone="warning" title="Truck removed in VMMS" className="mt-2">
          VMMS no longer lists this truck, so it can’t take repair updates for it. Cancel this ticket, or ask VMMS Operations to add the
          truck back.
        </Callout>
      )}
    </header>
  );
}
