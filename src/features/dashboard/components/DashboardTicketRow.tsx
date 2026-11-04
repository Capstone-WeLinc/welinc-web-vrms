import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
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
export function DashboardTicketRow({ ticket, facts }: { ticket: RepairTicket; facts: RowFact[] }) {
  return (
    <li>
      <Link
        to={`/repairs/${ticket.id}`}
        className="flex min-h-11 flex-col justify-center gap-1 px-4 py-2.5 outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span className="flex flex-wrap items-center gap-2">
          <PlateChip plate={ticket.vehiclePlate} />
          <StatusBadge status={ticket.status} />
        </span>
        <span className="flex flex-wrap gap-x-1.5 text-xs text-muted-foreground">
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
      </Link>
    </li>
  );
}

/** The bordered list the rows sit in, separated by dividers (design.md, no card per row). */
export function TicketRowList({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul aria-label={label} className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {children}
    </ul>
  );
}
