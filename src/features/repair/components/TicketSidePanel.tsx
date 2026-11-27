import { type ReactNode, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Ban, CircleAlert, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { BadgePill } from '../../../components/shared/BadgePill';
import { MechanicProblemBadge } from '../../../components/shared/MechanicProblemBadge';
import { MoreMenu } from '../../../components/shared/MoreMenu';
import { PriorityBadge } from '../../../components/shared/PriorityBadge';
import { driverLabel } from '../lib/ticketDriver';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { useToast } from '../../../context/toast';
import { useClamped } from '../../../hooks/useClamped';
import { dueValue } from '../../../lib/utils/due';
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
  /** Spec 0024, AC-13: a photo reason links to the Photos card. */
  onPhotosBlocked: () => void;
  /** Spec 0024, AC-18: `line` is the slim status line on phones and tablets; the fixed bar holds the buttons. */
  variant?: 'card' | 'line';
  /** Spec 0030, AC-8: the Due row's Change action; omitted when the caller may not change it. */
  onChangeDue?: () => void;
}

/**
 * Spec 0024, AC-17: the card's ⋮ menu. Copy ticket link for everyone; Cancel ticket last, after a
 * divider, only with a cancel move and an editable view.
 */
function MoreActions({ ticketId, cancel, onCancel }: { ticketId: string; cancel: TicketMove | null; onCancel: () => void }) {
  const { showToast } = useToast();
  const copyLink = () => {
    const url = `${window.location.origin}/repairs/${ticketId}`;
    const failed = () => showToast('Couldn’t copy the link. Copy it from the address bar.', 'error');
    // The clipboard exists only on https or localhost; elsewhere `navigator.clipboard` is undefined.
    if (!navigator.clipboard?.writeText) {
      failed();
      return;
    }
    navigator.clipboard.writeText(url).then(() => showToast('Ticket link copied', 'success'), failed);
  };
  return (
    <MoreMenu label="More actions" triggerClassName="-my-2 -mr-2 size-11 lg:size-8">
      <DropdownMenuItem onSelect={copyLink}>
        <Copy aria-hidden="true" />
        Copy ticket link
      </DropdownMenuItem>
      {cancel && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onCancel}>
            <Ban aria-hidden="true" />
            {cancel.label}
          </DropdownMenuItem>
        </>
      )}
    </MoreMenu>
  );
}

/** One label and value row of the Status card. */
function StatusRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-16 shrink-0 text-body text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-body text-foreground">{children}</dd>
    </div>
  );
}

/** Why the forward move waits. Only the two photo reasons become a link (AC-13); costs and uploads stay text. */
function BlockedReason({ id, actions, onPhotos }: { id: string; actions: TicketActions; onPhotos: () => void }) {
  if (!actions.blocked) return null;
  return (
    <p id={id} className="text-body text-muted-foreground">
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
 * Spec 0024, AC-17: no heading. Label and value rows for status, priority and due, the ⋮ menu at the
 * top right; then the actions: Return to mechanic (outlined) and the primary side by side once the card is 280px
 * wide, stacked with the primary on top below that, and the blocked reason under them. The phone line
 * (AC-18) has the same row and reason; the fixed bar holds its buttons.
 */
export function StatusCard({ ticket, now, readOnly, actions, onPrimary, onSecondary, onCancel, onPhotosBlocked, variant = 'card', onChangeDue }: StatusCardProps) {
  const { primary, secondary, cancel } = actions;
  const hasButton = !!(primary || secondary || cancel);
  const line = variant === 'line';
  const blockedId = line ? 'primary-blocked-line' : 'primary-blocked';
  // Only someone who may unlock sees the lock state (spec 0011, AC-12a)
  const lockBadge =
    ticket.can.unlock && isClosed(ticket) ? (
      ticket.isUnlocked ? (
        <BadgePill className="bg-highlight/25 text-highlight-foreground">Unlocked for editing</BadgePill>
      ) : (
        <BadgePill className="bg-status-cancelled-bg text-status-cancelled-fg">Locked</BadgePill>
      )
    ) : null;

  const due = dueValue(ticket, now);
  // AC-17: label and value rows (Status, Priority, Due), the ⋮ at the top right
  const badges = (
    <div className="flex items-start justify-between gap-2">
      <dl className="flex min-w-0 flex-col gap-1.5">
        <StatusRow label="Status">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusBadge status={ticket.status} />
            <MechanicProblemBadge ticket={ticket} />
            {lockBadge}
          </span>
        </StatusRow>
        {ticket.priority && (
          <StatusRow label="Priority">
            <PriorityBadge priority={ticket.priority} />
          </StatusRow>
        )}
        {due && ticket.dueAt && (
          <StatusRow label="Due">
            <time dateTime={ticket.dueAt} className="block">
              {due.date}
            </time>
            {/* Under the date, never trailing it */}
            {due.overdue ? (
              <span className="block text-caption font-medium text-destructive">{due.note ?? 'Past due'}</span>
            ) : due.dueSoon ? (
              <span className="block text-caption font-medium text-warning">Due soon, {due.note}</span>
            ) : (
              due.note && <span className="block text-caption text-muted-foreground">{due.note}</span>
            )}
            {onChangeDue && (
              <Button variant="link" size="sm" className="h-auto p-0 text-caption" aria-label="Change due date" onClick={onChangeDue}>
                Change
              </Button>
            )}
          </StatusRow>
        )}
      </dl>
      <MoreActions ticketId={ticket.id} cancel={!readOnly ? (cancel ?? null) : null} onCancel={onCancel} />
    </div>
  );

  const reason = <BlockedReason id={blockedId} actions={actions} onPhotos={onPhotosBlocked} />;

  const body = readOnly ? (
    <div className="flex flex-col items-start gap-1 text-body text-muted-foreground">
      <p>View only</p>
      {hasButton && (
        <Button asChild variant="link" className="h-auto px-0">
          <Link to={`/repairs/${ticket.id}`}>Open editable view</Link>
        </Button>
      )}
    </div>
  ) : (
    <div className="flex flex-col gap-2">
      {actions.note && <p className="text-body text-muted-foreground">{actions.note}</p>}
      {/* The line leaves the primary and Return to mechanic to the fixed bar, so its reason stands alone;
          without a primary the bar has nothing, so Return stays. */}
      {line && reason}
      {(line ? !primary && secondary : primary || secondary) && (
        // AC-17: the primary first, so it sits on top when stacked; side by side it moves right, equal widths
        <div className="flex flex-col gap-2 @[280px]:flex-row-reverse">
          {primary && !line && (
            <Button
              size="touch"
              className="w-full min-w-0 flex-1 lg:h-10 lg:text-body"
              onClick={onPrimary}
              disabled={!!actions.blocked}
              aria-describedby={actions.blocked ? blockedId : undefined}
            >
              {primary.kind === 'move' ? primary.move.label : primary.label}
            </Button>
          )}
          {secondary && (
            <Button variant="outline" size="touch" className="w-full min-w-0 flex-1 lg:h-10 lg:text-body" onClick={onSecondary}>
              {secondary.label}
            </Button>
          )}
        </div>
      )}
      {/* The reason is helper text under the buttons */}
      {!line && reason}
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
    // A container, so the buttons pair up by the card's own width, not the screen's (AC-17)
    <Card role="region" aria-label="Status" className="@container gap-3 p-4 md:p-5">
      {badges}
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
      {driverLabel(ticket.driverName)}
      {/* Sent with the cost record only (ticket.costs.view) */}
      {ticket.driverIsVerified != null && (
        <span className={cn('inline-flex items-center gap-1 text-caption font-medium', ticket.driverIsVerified ? 'text-success' : 'text-muted-foreground')}>
          {ticket.driverIsVerified ? <BadgeCheck aria-hidden="true" className="size-3.5" /> : <CircleAlert aria-hidden="true" className="size-3.5" />}
          {ticket.driverIsVerified ? 'Verified' : 'Not verified'}
        </span>
      )}
    </span>
  );
}

function DateValue({ value }: { value: string | null | undefined }) {
  return value ? <time dateTime={value}>{formatShortDate(value)}</time> : <>—</>;
}

function DetailsGroup({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h3 id={id} className="text-label text-muted-foreground">
        {title}
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</dl>
    </section>
  );
}

/**
 * Spec 0024, AC-16: the ticket's details under two small headings, Vehicle and Record. Plate and model
 * show here as well as in the title (your call, 2026-11-07); priority and due are in the Status card. The details Edit dialog fixes the vehicle
 * part (spec 0019, AC-20), so its Edit button comes in as `action`.
 */
export function DetailsCard({ ticket, now, action }: { ticket: RepairTicket; now: number; action?: ReactNode }) {
  return (
    <DetailSection title="Details" action={action}>
      <DetailsGroup title="Vehicle">
        {/* Shown here too, though the title has them, so Details holds the whole vehicle record */}
        <DetailItem label="Plate">
          <span className="whitespace-nowrap">{ticket.vehiclePlate}</span>
        </DetailItem>
        <DetailItem label="Model">{ticket.vehicleModel || '—'}</DetailItem>
        <DetailItem label="Odometer" className="col-span-2">
          {ticket.odometerReading != null ? <span className="tabular-nums">{ticket.odometerReading.toLocaleString('en-US')} km</span> : '—'}
        </DetailItem>
        <DetailItem label="Driver" className="col-span-2">
          <DriverValue ticket={ticket} />
        </DetailItem>
        {ticket.accountType && (
          <DetailItem label="Account" className="col-span-2">
            {ticket.accountType === 'CORPORATE' ? `Corporate${ticket.corporation ? `, ${ticket.corporation}` : ''}` : 'Online'}
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
              <time dateTime={ticket.verifiedAt} className="block text-caption text-muted-foreground">
                {formatDateTime(ticket.verifiedAt)}
              </time>
            )}
          </DetailItem>
        )}
      </dl>
    </DetailSection>
  );
}
