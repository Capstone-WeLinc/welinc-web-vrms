import { type ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BadgeCheck, CircleAlert, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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

/** Spec 0014, AC-15: the primary move and Return to mechanic side by side; Cancel sits in the ⋮ menu. */
export function StatusCard({ ticket, readOnly, actions, onPrimary, onSecondary, onCancel, onPhotosBlocked, variant = 'card' }: StatusCardProps) {
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
        <MechanicProblemBadge ticket={ticket} />
        {lockBadge}
      </div>
      {!readOnly && cancel && <MoreActions cancel={cancel} onCancel={onCancel} />}
    </div>
  );

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
      <BlockedReason id={blockedId} actions={actions} onPhotos={onPhotosBlocked} />
      {/* The line leaves the primary and Return to mechanic to the fixed bar; without a primary the bar has
          nothing, so Return stays. One column under 300px, where two side by side overflow (about 400% zoom). */}
      {(line ? !primary && secondary : primary || secondary) && (
        <div className={cn('grid gap-2', primary && secondary && 'min-[300px]:grid-cols-2')}>
          {primary && (
            <Button
              size="touch"
              className="w-full lg:h-10 lg:text-sm"
              onClick={onPrimary}
              disabled={!!actions.blocked}
              aria-describedby={actions.blocked ? blockedId : undefined}
            >
              {primary.kind === 'move' ? primary.move.label : primary.label}
            </Button>
          )}
          {secondary && (
            <Button variant="outline" size="touch" className="w-full lg:h-10 lg:text-sm" onClick={onSecondary}>
              {secondary.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );

  if (line) {
    return (
      <section aria-label="Status" className="flex flex-col gap-2 border-b border-border pb-3">
        {badges}
        {body}
      </section>
    );
  }
  return (
    <DetailSection title="Status">
      {badges}
      {body}
    </DetailSection>
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

/**
 * Spec 0024, AC-16: the ticket's details with the vehicle and driver (spec 0019, AC-20: the details
 * Edit dialog fixes the vehicle part, so its Edit button comes in as `action`).
 */
export function DetailsCard({ ticket, now, action }: { ticket: RepairTicket; now: number; action?: ReactNode }) {
  return (
    <DetailSection title="Details" action={action}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <DetailItem label="Plate">{ticket.vehiclePlate}</DetailItem>
        <DetailItem label="Model">{ticket.vehicleModel || '—'}</DetailItem>
        <DetailItem label="Odometer">
          {ticket.odometerReading != null ? <span className="tabular-nums">{ticket.odometerReading.toLocaleString('en-US')} km</span> : '—'}
        </DetailItem>
        <DetailItem label="Priority">{ticket.priority ? <PriorityBadge priority={ticket.priority} /> : '—'}</DetailItem>
        <DetailItem label="Driver" className="col-span-2">
          <DriverValue ticket={ticket} />
        </DetailItem>
        {ticket.accountType && (
          <DetailItem label="Account" className="col-span-2">
            {ticket.accountType === 'CORPORATE' ? `Corporate${ticket.corporation ? ` · ${ticket.corporation}` : ''}` : 'Online'}
          </DetailItem>
        )}
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
        {/* Spec 0019, AC-19: the last edit after create */}
        {ticket.editedAt && (
          <DetailItem label="Last edit" className="col-span-2">
            <time dateTime={ticket.editedAt} title={formatDateTime(ticket.editedAt)}>
              Edited {formatRelativeTime(ticket.editedAt, new Date(now))}
            </time>
            {ticket.editedByName && <> by {ticket.editedByName}</>}
          </DetailItem>
        )}
        {isClosed(ticket) && (
          <DetailItem label="Closed">
            <DateValue value={ticket.closedAt} />
          </DetailItem>
        )}
      </dl>
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
