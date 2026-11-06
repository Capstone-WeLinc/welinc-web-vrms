import { type ReactNode, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BadgeCheck, CircleAlert, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { BadgePill } from '../../../components/shared/BadgePill';
import { MechanicProblemBadge } from '../../../components/shared/MechanicProblemBadge';
import { PriorityBadge } from '../../../components/shared/PriorityBadge';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { useClamped } from '../../../hooks/useClamped';
import { dueLabel, isOpen } from '../../../lib/utils/due';
import { formatDateTime, formatRelativeTime, formatShortDate } from '../../../lib/utils/format';
import type { RepairTicket, TicketMove } from '../../../types';
import { isClosed, type TicketActions } from '../lib/nextAction';
import { DetailItem, DetailSection } from '../../../components/shared/DetailSection';

interface StatusCardProps {
  ticket: RepairTicket;
  /** The time of the last fetch, for the due and overdue text. */
  now: number;
  readOnly: boolean;
  actions: TicketActions;
  onPrimary: () => void;
  onSecondary: () => void;
  onCancel: () => void;
  /** Spec 0024, AC-13: a photo reason links to the Photos line. */
  onPhotosBlocked: () => void;
  /** Spec 0024, AC-18: `line` is the slim status line on phones and tablets; the fixed bar holds the buttons. */
  variant?: 'card' | 'line';
}

/** Spec 0024, AC-17: Cancel ticket lives here, away from the main action. Hidden with no cancel move. */
function MoreActions({ cancel, onCancel }: { cancel: TicketMove; onCancel: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="-my-2 -mr-2 size-11 shrink-0 text-muted-strong lg:size-8" aria-label="More actions">
          <MoreVertical aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem variant="destructive" onSelect={onCancel}>
          {cancel.label}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Why the forward move waits. Only the two photo reasons become a link (AC-13); costs and uploads stay text. */
function BlockedReason({ id, actions, onPhotos }: { id: string; actions: TicketActions; onPhotos: () => void }) {
  if (!actions.blocked) return null;
  return (
    <p id={id} className="text-sm text-muted-foreground">
      {actions.blockedBy ? (
        <Button type="button" variant="link" className="h-auto min-h-11 p-0 text-left whitespace-normal lg:min-h-0" onClick={onPhotos}>
          {actions.blocked}
        </Button>
      ) : (
        actions.blocked
      )}
    </p>
  );
}

/**
 * Spec 0024, AC-17: no heading. The badges with the ⋮ menu, the due line, then the primary move with
 * its blocked reason under it and Return to mechanic, stacked. The phone line (AC-18) has the same
 * badges, due line and reason; the fixed bar holds its buttons.
 */
export function StatusCard({ ticket, now, readOnly, actions, onPrimary, onSecondary, onCancel, onPhotosBlocked, variant = 'card' }: StatusCardProps) {
  const { primary, secondary, cancel } = actions;
  const hasButton = !!(primary || secondary || cancel);
  const line = variant === 'line';
  const blockedId = line ? 'primary-blocked-line' : 'primary-blocked';
  // Only someone who may unlock sees the lock state (spec 0011, AC-12a)
  const lockBadge =
    ticket.can.unlock && isClosed(ticket) ? (
      ticket.isUnlocked ? (
        <BadgePill className="bg-highlight text-highlight-foreground">Unlocked for editing</BadgePill>
      ) : (
        <BadgePill className="bg-status-cancelled-bg text-status-cancelled-fg">Locked</BadgePill>
      )
    ) : null;

  const badges = (
    <div className="flex min-h-9 items-center justify-between gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <StatusBadge status={ticket.status} />
        {ticket.priority && <PriorityBadge priority={ticket.priority} />}
        <MechanicProblemBadge ticket={ticket} />
        {lockBadge}
      </div>
      {!readOnly && cancel && <MoreActions cancel={cancel} onCancel={onCancel} />}
    </div>
  );

  const due = <DueLine ticket={ticket} now={now} />;
  const reason = <BlockedReason id={blockedId} actions={actions} onPhotos={onPhotosBlocked} />;

  const body = readOnly ? (
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
      {/* The line leaves the primary and Return to mechanic to the fixed bar, so its reason stands alone;
          without a primary the bar has nothing, so Return stays. */}
      {line && reason}
      {(line ? !primary && secondary : primary || secondary) && (
        <div className="flex flex-col gap-2">
          {primary && !line && (
            <div className="flex flex-col gap-1">
              <Button
                size="touch"
                className="w-full lg:h-10 lg:text-sm"
                onClick={onPrimary}
                disabled={!!actions.blocked}
                aria-describedby={actions.blocked ? blockedId : undefined}
              >
                {primary.kind === 'move' ? primary.move.label : primary.label}
              </Button>
              {reason}
            </div>
          )}
          {secondary && (
            <Button variant="outline" size="touch" className="w-full lg:h-10 lg:text-sm" onClick={onSecondary}>
              {secondary.label}
            </Button>
          )}
        </div>
      )}
      {!line && !primary && reason}
    </div>
  );

  if (line) {
    return (
      <section aria-label="Status" className="flex flex-col gap-2 border-b border-border pb-3">
        {badges}
        {due}
        {body}
      </section>
    );
  }
  return (
    <Card role="region" aria-label="Status" className="gap-3 p-4 md:p-5">
      {badges}
      {due}
      {body}
    </Card>
  );
}

/**
 * Spec 0024, AC-16: the latest remark and the cancellation reason, as a 3 line preview with Show
 * more only when cut off. No card when both are empty.
 */
export function NotesCard({ ticket }: { ticket: RepairTicket }) {
  const [expanded, setExpanded] = useState(false);
  const { ref: reasonRef, clamped: reasonClamped } = useClamped<HTMLDivElement>();
  const { ref: remarkRef, clamped: remarkClamped } = useClamped<HTMLDivElement>();
  if (!ticket.cancellationReason && !ticket.remarks) return null;
  const clamp = expanded ? 'whitespace-pre-line' : 'line-clamp-3 whitespace-pre-line';
  return (
    <DetailSection title="Notes">
      <dl className="flex flex-col gap-3">
        {ticket.cancellationReason && (
          <DetailItem label="Cancellation reason">
            <div ref={reasonRef} className={clamp}>
              {ticket.cancellationReason}
            </div>
          </DetailItem>
        )}
        {ticket.remarks && (
          <DetailItem label="Latest remark">
            <div ref={remarkRef} className={clamp}>
              {ticket.remarks}
            </div>
          </DetailItem>
        )}
      </dl>
      {(expanded || reasonClamped || remarkClamped) && (
        <Button type="button" variant="link" size="sm" className="-mt-2 h-auto min-h-11 self-start px-0 lg:min-h-0" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Show less' : 'Show more'}
        </Button>
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
        <span className={cn('inline-flex items-center gap-1 text-xs font-medium', ticket.driverIsVerified ? 'text-success' : 'text-muted-foreground')}>
          {ticket.driverIsVerified ? <BadgeCheck aria-hidden="true" className="size-3.5" /> : <CircleAlert aria-hidden="true" className="size-3.5" />}
          {ticket.driverIsVerified ? 'Verified' : 'Not verified'}
        </span>
      )}
    </span>
  );
}

/**
 * AC-17: the due date with its due or overdue text. Due text only means something while the ticket is
 * open (For verification included); Closed and Cancelled show the date alone. No due date, no line.
 */
function DueLine({ ticket, now }: { ticket: RepairTicket; now: number }) {
  if (!ticket.dueAt || Number.isNaN(Date.parse(ticket.dueAt))) return null;
  const due = isOpen(ticket) ? dueLabel(ticket, now) : null;
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-foreground">
      <span className="text-muted-foreground">Due</span>
      <time dateTime={ticket.dueAt}>{formatShortDate(ticket.dueAt)}</time>
      {due && (
        <span className={cn('inline-flex items-center gap-1.5', due.overdue ? 'font-medium text-destructive' : 'text-muted-foreground')}>
          <span aria-hidden="true">·</span>
          {due.overdue && <AlertTriangle role="img" aria-label="Overdue" className="size-3.5 shrink-0" />}
          {due.text}
        </span>
      )}
    </p>
  );
}

function DateValue({ value }: { value: string | null | undefined }) {
  return value ? <time dateTime={value}>{formatShortDate(value)}</time> : <>—</>;
}

function DetailsGroup({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h3 id={id} className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</dl>
    </section>
  );
}

/**
 * Spec 0024, AC-16: the ticket's details under two small headings, Vehicle and Record. Plate and model
 * are in the title, priority and due in the Status card. The details Edit dialog fixes the vehicle
 * part (spec 0019, AC-20), so its Edit button comes in as `action`.
 */
export function DetailsCard({ ticket, now, action }: { ticket: RepairTicket; now: number; action?: ReactNode }) {
  return (
    <DetailSection title="Details" action={action}>
      <DetailsGroup title="Vehicle">
        <DetailItem label="Odometer" className="col-span-2">
          {ticket.odometerReading != null ? <span className="tabular-nums">{ticket.odometerReading.toLocaleString('en-US')} km</span> : '—'}
        </DetailItem>
        <DetailItem label="Driver" className="col-span-2">
          <DriverValue ticket={ticket} />
        </DetailItem>
        {ticket.accountType && (
          <DetailItem label="Account" className="col-span-2">
            {ticket.accountType === 'CORPORATE' ? `Corporate${ticket.corporation ? ` · ${ticket.corporation}` : ''}` : 'Online'}
          </DetailItem>
        )}
      </DetailsGroup>
      <Separator />
      <DetailsGroup title="Record">
        <DetailItem label="Garage" className="col-span-2">
          {ticket.garageLocation ?? '—'}
        </DetailItem>
        <DetailItem label="Created">
          <DateValue value={ticket.createdAt} />
        </DetailItem>
        <DetailItem label="Updated">
          <DateValue value={ticket.updatedAt} />
        </DetailItem>
        {/* Spec 0019, AC-19: the last edit after create */}
        {ticket.editedAt && (
          <DetailItem label="Last edit" className="col-span-2">
            <time dateTime={ticket.editedAt} title={formatDateTime(ticket.editedAt)}>
              Edited {formatRelativeTime(ticket.editedAt, new Date(now))}
            </time>
            {ticket.editedByName && <> by {ticket.editedByName}</>}
          </DetailItem>
        )}
        {ticket.closedAt && (
          <DetailItem label="Closed">
            <DateValue value={ticket.closedAt} />
          </DetailItem>
        )}
      </DetailsGroup>
    </DetailSection>
  );
}

/** Spec 0019, AC-20: the mechanics Edit button comes in as `action`. */
export function PeopleCard({ ticket, action }: { ticket: RepairTicket; action?: ReactNode }) {
  const mechanics = ticket.mechanics ?? [];
  return (
    <DetailSection title="People" action={action}>
      <dl className="flex flex-col gap-3">
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
        {ticket.reportedByName && <DetailItem label="Reported by">{ticket.reportedByName}</DetailItem>}
        {ticket.verifiedByName && (
          <DetailItem label="Verified by">
            <span className="block">{ticket.verifiedByName}</span>
            {ticket.verifiedAt && (
              <time dateTime={ticket.verifiedAt} className="block text-xs text-muted-foreground">
                {formatDateTime(ticket.verifiedAt)}
              </time>
            )}
          </DetailItem>
        )}
      </dl>
    </DetailSection>
  );
}
