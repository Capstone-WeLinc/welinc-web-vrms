import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { PlateChip } from '../../../components/shared/PlateChip';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import type { RepairTicket } from '../../../types';

/** One muted fact after the ticket number; `overdue` shows it in the destructive color. */
export type RowFact = { text: string; overdue?: boolean; title?: string };

/**
 * Spec 0022, AC-8: the Chief dashboard's one ticket row. Line 1 the plate and status, line 2 the
 * ticket number and the section's facts. The whole row is one link, at least 44px tall on phones.
 */
export function DashboardTicketRow({
  ticket,
  facts,
  lead,
}: {
  ticket: RepairTicket;
  facts: RowFact[];
  /** Line 1 after the plate, in place of the status badge, when every row shares that status. */
  lead?: ReactNode;
}) {
  return (
    <li>
      <Link
        to={`/repairs/${ticket.id}`}
        className="group flex min-h-11 items-center gap-3 px-4 py-3 outline-none transition-colors duration-150 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-reduce:transition-none md:px-5"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex flex-wrap items-center gap-2">
            <PlateChip plate={ticket.vehiclePlate} />
            {lead ?? <StatusBadge status={ticket.status} />}
          </span>
          <span className="flex flex-wrap gap-x-1.5 text-caption text-muted-foreground">
            <span className="whitespace-nowrap">{ticket.repairNumber}</span>
            {facts.map((fact) => (
              <span
                key={fact.text}
                title={fact.title}
                className={cn('wrap-anywhere', fact.overdue && 'font-medium text-destructive')}
              >
                <span aria-hidden="true">· </span>
                {fact.text}
              </span>
            ))}
          </span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
        />
      </Link>
    </li>
  );
}

/** The rows inside a panel, separated by dividers (design.md: no card per row). */
export function TicketRowList({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul aria-label={label} className="divide-y divide-border">
      {children}
    </ul>
  );
}
