import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { formatClockTime, formatDateTime, getInitials } from '../../../lib/utils/format';
import type { AuditEvent } from '../../../types';
import { actorLabel, changeOf, costDetailLine, costTotalLine, eventStyle } from '../lib/auditEvents';

const FOCUSABLE_TEXT = 'rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring';

function Actor({ event, name }: { event: AuditEvent; name: string }) {
  const email = event.actor?.email;
  return (
    <span className="inline-flex items-center gap-1.5 align-top">
      <span
        aria-hidden="true"
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
      >
        {getInitials(name)}
      </span>
      {email && email !== name ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className={cn('font-semibold text-foreground', FOCUSABLE_TEXT)}>
              {name}
              <span className="sr-only"> ({email})</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>{email}</TooltipContent>
        </Tooltip>
      ) : (
        <span className="font-semibold text-foreground">{name}</span>
      )}
    </span>
  );
}

/** The sentence for the event (AC-11), with the actor and repair number inline. */
function Sentence({ event, showTicket }: { event: AuditEvent; showTicket: boolean }) {
  const name = actorLabel(event);
  // On the ticket's own page the number stays as plain text: a link back to the same page is noise.
  const rep = showTicket ? (
    <Link to={`/repairs/${event.ticket.id}`} className="font-medium whitespace-nowrap text-primary underline-offset-4 hover:underline">
      {event.ticket.repairNumber}
    </Link>
  ) : (
    <span className="font-medium whitespace-nowrap">{event.ticket.repairNumber}</span>
  );
  const who = name ? <Actor event={event} name={name} /> : null;

  const withActor = (verb: string, tail = ''): ReactNode => (
    <>
      {who} {verb} {rep}
      {tail}
    </>
  );

  switch (event.type) {
    case 'CREATED':
      return who ? withActor('created') : <>{rep} was created</>;
    case 'STATUS_CHANGE':
      return who ? withActor('changed the status of') : <>The status of {rep} was changed</>;
    case 'COST_UPDATE':
      return who ? withActor('updated the costs of') : <>The costs of {rep} were updated</>;
    case 'UNLOCK':
      return who ? withActor('unlocked') : <>{rep} was unlocked</>;
    case 'GARAGE_CHANGE':
      return who ? withActor('moved', ' to a different garage') : <>{rep} was moved to a different garage</>;
    case 'KNOWLEDGE_LINK':
      return who ? withActor('changed a known fix on') : <>A known fix on {rep} was changed</>;
    case 'MECHANIC_ASSIGNED':
      return who ? withActor('assigned a mechanic to') : <>A mechanic was assigned to {rep}</>;
    case 'MECHANIC_UNASSIGNED':
      return who ? withActor('removed a mechanic from') : <>A mechanic was removed from {rep}</>;
    default:
      return who ? (
        <>
          {who} {event.type} on {rep}
        </>
      ) : (
        <>
          {event.type} on {rep}
        </>
      );
  }
}

/** The before and after of the event's changes under the sentence, when the type has one. */
function Change({ event }: { event: AuditEvent }) {
  if (event.type === 'STATUS_CHANGE') {
    const status = changeOf(event, 'repairStatus');
    if (!status?.after) return null;
    return (
      <p className="flex flex-wrap items-center gap-2">
        {status.before && (
          <>
            <StatusBadge status={status.before} />
            <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground" />
            <span className="sr-only">to</span>
          </>
        )}
        <StatusBadge status={status.after} />
      </p>
    );
  }
  if (event.type === 'COST_UPDATE') {
    const total = costTotalLine(event);
    const detail = costDetailLine(event);
    if (!total && !detail) return null;
    return (
      <div className="flex flex-col gap-0.5 tabular-nums">
        {total && <p className="text-sm font-medium text-foreground">{total}</p>}
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
    );
  }
  if (event.type === 'KNOWLEDGE_LINK') {
    const entry = changeOf(event, 'knowledgeEntry');
    if (!entry) return null;
    return (
      <p className="text-sm text-muted-foreground">
        {entry.after ? `Linked known fix: ${entry.after}` : 'Removed known fix'}
        {entry.before && entry.after && ` (was ${entry.before})`}
      </p>
    );
  }
  if (event.type === 'MECHANIC_ASSIGNED') {
    const names = event.changes.filter((c) => c.field === 'mechanic' && c.after).map((c) => c.after);
    if (names.length === 0) return null;
    return <p className="text-sm text-muted-foreground">Assigned: {names.join(', ')}.</p>;
  }
  if (event.type === 'MECHANIC_UNASSIGNED') {
    const mechanic = changeOf(event, 'mechanic');
    const reopened = changeOf(event, 'repairStatus')?.after === 'OPEN';
    if (!mechanic?.before) return null;
    return (
      <p className="text-sm text-muted-foreground">
        {mechanic.before} was taken off{reopened ? '. The ticket went back to Open.' : '.'}
      </p>
    );
  }
  if (event.type === 'GARAGE_CHANGE') {
    const garage = changeOf(event, 'garage');
    if (!garage) return null;
    return (
      <p className="text-sm text-muted-foreground">
        {garage.before ?? 'No garage'} → {garage.after ?? 'No garage'}
      </p>
    );
  }
  return null;
}

/** The changes, then the reason or comment that came with them (cancel, unlock, remarks). */
function Detail({ event }: { event: AuditEvent }) {
  return (
    <>
      <Change event={event} />
      {event.note && <p className="text-sm text-muted-foreground">“{event.note}”</p>}
    </>
  );
}

export function AuditEventItem({ event, showTicket = true }: { event: AuditEvent; showTicket?: boolean }) {
  const { icon: Icon, tone } = eventStyle(event.type);

  return (
    <li className="group/event relative flex gap-3 pb-6 last:pb-0">
      {/* The rail joining this event to the next one */}
      <span aria-hidden="true" className="absolute top-10 bottom-1 left-4 w-px -translate-x-1/2 bg-border group-last/event:hidden" />
      <span aria-hidden="true" className={cn('relative flex size-8 shrink-0 items-center justify-center rounded-full', tone)}>
        <Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <p className="min-w-0 text-sm leading-6 text-foreground">
            <Sentence event={event} showTicket={showTicket} />
          </p>
          <Tooltip>
            <TooltipTrigger asChild>
              <time
                tabIndex={0}
                dateTime={event.at}
                className={cn('shrink-0 text-xs leading-6 whitespace-nowrap text-muted-foreground tabular-nums', FOCUSABLE_TEXT)}
              >
                {formatClockTime(event.at)}
              </time>
            </TooltipTrigger>
            <TooltipContent>{formatDateTime(event.at)}</TooltipContent>
          </Tooltip>
        </div>
        <Detail event={event} />
      </div>
    </li>
  );
}
