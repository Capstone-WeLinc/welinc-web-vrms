import { PlateChip } from '../../../components/shared/PlateChip';
import type { RepairTicket } from '../../../types';
import { stripSystem } from '../lib/issueRow';

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
          {ticket.vehicleModel && <span className="text-sm font-medium text-muted-strong">{ticket.vehicleModel}</span>}
        </span>
        {first && <span className="line-clamp-1 text-xl font-semibold break-words md:text-2xl">{stripSystem(first.description)}</span>}
      </h1>
      <p className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">{ticket.repairNumber}</p>
    </header>
  );
}
