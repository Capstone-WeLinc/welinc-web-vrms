import { Link } from 'react-router-dom';
import { AlertTriangle, BadgeCheck, CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BadgePill } from '../../../components/shared/BadgePill';
import { MechanicProblemBadge } from '../../../components/shared/MechanicProblemBadge';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { dueLabel, isOpen } from '../../../lib/utils/due';
import { formatShortDate } from '../../../lib/utils/format';
import type { RepairTicket } from '../../../types';
import { isClosed, type TicketActions } from '../lib/nextAction';
import { DetailItem, DetailSection } from '../../../components/shared/DetailSection';

interface StatusCardProps {
  ticket: RepairTicket;
  readOnly: boolean;
  actions: TicketActions;
  onPrimary: () => void;
  onSecondary: () => void;
  onCancel: () => void;
}

/** Spec 0014, AC-15: the primary move and Send back side by side, Cancel under them. */
export function StatusCard({ ticket, readOnly, actions, onPrimary, onSecondary, onCancel }: StatusCardProps) {
  const { primary, secondary, cancel } = actions;
  const hasButton = !!(primary || secondary || cancel);
  // Only someone who may unlock sees the lock state (spec 0011, AC-12a)
  const lockBadge =
    ticket.can.unlock && isClosed(ticket) ? (
      ticket.isUnlocked ? (
        <BadgePill className="bg-highlight text-highlight-foreground">Unlocked for editing</BadgePill>
      ) : (
        <BadgePill className="bg-status-cancelled-bg text-status-cancelled-fg">Locked</BadgePill>
      )
    ) : null;

  return (
    <DetailSection title="Status">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={ticket.status} />
        <MechanicProblemBadge ticket={ticket} />
        {lockBadge}
      </div>
      {readOnly ? (
        <div className="flex flex-col items-start gap-1 text-sm text-muted-foreground">
          <p>View only</p>
          {hasButton && (
            <Button asChild variant="link" className="h-auto px-0">
              <Link to={`/repairs/${ticket.id}`}>Open editable view</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {actions.note && <p className="text-sm text-muted-foreground">{actions.note}</p>}
          {actions.blocked && (
            <p id="primary-blocked" className="text-sm text-muted-foreground">
              {actions.blocked}
            </p>
          )}
          {(primary || secondary) && (
            // Below lg the fixed bar carries the primary and Send back, so the card hides its copy (one
            // button per action for a screen reader). Without a primary the bar has nothing, so it stays.
            // One column under 300px, where two side by side overflow the card (about 400% zoom).
            <div className={cn(primary ? 'hidden lg:grid' : 'grid', 'gap-2', primary && secondary && 'min-[300px]:grid-cols-2')}>
              {primary && (
                <>
                  <Button
                    size="touch"
                    className="w-full lg:h-10 lg:text-sm"
                    onClick={onPrimary}
                    disabled={!!actions.blocked}
                    aria-describedby={actions.blocked ? 'primary-blocked' : undefined}
                  >
                    {primary.kind === 'move' ? primary.move.label : primary.label}
                  </Button>
                </>
              )}
              {secondary && (
                <Button variant="outline" size="touch" className="w-full lg:h-10 lg:text-sm" onClick={onSecondary}>
                  {secondary.label}
                </Button>
              )}
            </div>
          )}
          {cancel && (
            <Button
              variant="outline"
              size="touch"
              className="w-full border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive lg:h-10 lg:text-sm"
              onClick={onCancel}
            >
              {cancel.label}
            </Button>
          )}
        </div>
      )}
    </DetailSection>
  );
}

function DueValue({ ticket, now }: { ticket: RepairTicket; now: number }) {
  if (!ticket.dueAt || Number.isNaN(Date.parse(ticket.dueAt))) return <>—</>;
  // Due text only means something while the ticket is open.
  const due = isOpen(ticket) ? dueLabel(ticket, now) : null;
  return (
    <span className="flex flex-col">
      <time dateTime={ticket.dueAt}>{formatShortDate(ticket.dueAt)}</time>
      {due && (
        <span className={cn('inline-flex items-center gap-1.5 text-xs', due.overdue ? 'font-medium text-destructive' : 'text-muted-foreground')}>
          {due.overdue && <AlertTriangle role="img" aria-label="Overdue" className="size-3.5 shrink-0" />}
          {due.text}
        </span>
      )}
    </span>
  );
}

function DateValue({ value }: { value: string | null | undefined }) {
  return value ? <time dateTime={value}>{formatShortDate(value)}</time> : <>—</>;
}

export function DetailsCard({ ticket, now }: { ticket: RepairTicket; now: number }) {
  return (
    <DetailSection title="Details">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <DetailItem label="Due date">
          <DueValue ticket={ticket} now={now} />
        </DetailItem>
        <DetailItem label="Garage">{ticket.garageLocation ?? '—'}</DetailItem>
        <DetailItem label="Created">
          <DateValue value={ticket.createdAt} />
        </DetailItem>
        <DetailItem label="Updated">
          <DateValue value={ticket.updatedAt} />
        </DetailItem>
        {isClosed(ticket) && (
          <DetailItem label="Closed">
            <DateValue value={ticket.closedAt} />
          </DetailItem>
        )}
      </dl>
    </DetailSection>
  );
}

export function PeopleCard({ ticket }: { ticket: RepairTicket }) {
  const mechanics = ticket.mechanics ?? [];
  return (
    <DetailSection title="People">
      <dl className="flex flex-col gap-3">
        <DetailItem label="Driver">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {ticket.driverName}
            {/* Sent with the cost record only (ticket.costs.view) */}
            {ticket.driverIsVerified != null && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-medium',
                  ticket.driverIsVerified ? 'text-success' : 'text-muted-foreground',
                )}
              >
                {ticket.driverIsVerified ? (
                  <BadgeCheck aria-hidden="true" className="size-3.5" />
                ) : (
                  <CircleAlert aria-hidden="true" className="size-3.5" />
                )}
                {ticket.driverIsVerified ? 'Verified' : 'Not verified'}
              </span>
            )}
          </span>
        </DetailItem>
        <DetailItem label={mechanics.length === 1 ? 'Mechanic' : 'Mechanics'}>
          {mechanics.length === 0 ? (
            'No mechanic yet.'
          ) : (
            <ul className="flex flex-col gap-1">
              {mechanics.map((mechanic) => (
                <li key={mechanic.id}>{mechanic.name}</li>
              ))}
            </ul>
          )}
        </DetailItem>
        {ticket.accountType && (
          <DetailItem label="Account">{ticket.accountType === 'CORPORATE' ? 'Corporate' : 'Online'}</DetailItem>
        )}
        {ticket.corporation && <DetailItem label="Corporation">{ticket.corporation}</DetailItem>}
        {ticket.reportedByName && <DetailItem label="Reported by">{ticket.reportedByName}</DetailItem>}
        {ticket.verifiedByName && <DetailItem label="Verified by">{ticket.verifiedByName}</DetailItem>}
      </dl>
    </DetailSection>
  );
}
