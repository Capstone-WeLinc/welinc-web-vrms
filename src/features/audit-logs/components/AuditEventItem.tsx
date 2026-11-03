import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { formatClockTime, formatDateTime, getInitials } from '../../../lib/utils/format';
import type { AuditEvent } from '../../../types';
import {
  actorLabel,
  attachmentLine,
  changeOf,
  costDetailLine,
  costTotalLine,
  eventStyle,
  issueEventLines,
  movedFileName,
  photoMoveLine,
  stepLine,
  ticketEditLines,
  ticketTextLines,
} from '../lib/auditEvents';

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
    case 'ATTACHMENT_ADDED':
      return who ? withActor('added a file to') : <>A file was added to {rep}</>;
    case 'ATTACHMENT_REMOVED':
      return who ? withActor('removed a file from') : <>A file was removed from {rep}</>;
    case 'ATTACHMENT_MOVED':
      return who ? withActor('moved a photo on') : <>A photo was moved on {rep}</>;
    // Spec 0019, AC-19b
    case 'TICKET_EDITED':
      return who ? withActor('edited') : <>{rep} was edited</>;
    case 'ISSUE_ADDED':
      return who ? withActor('added an issue to') : <>An issue was added to {rep}</>;
    case 'ISSUE_EDITED':
      return who ? withActor('edited an issue on') : <>An issue on {rep} was edited</>;
    case 'ISSUE_REMOVED':
      return who ? withActor('removed an issue from') : <>An issue was removed from {rep}</>;
    // Spec 0021, AC-15
    case 'LOCKED':
      return who ? withActor('locked', ' again') : <>{rep} was locked again</>;
    case 'STEP_CHECKED':
      return who ? withActor('ticked a step on') : <>A step was ticked on {rep}</>;
    case 'STEP_UNCHECKED':
      return who ? withActor('unticked a step on') : <>A step was unticked on {rep}</>;
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
  if (event.type === 'ATTACHMENT_ADDED' || event.type === 'ATTACHMENT_REMOVED') {
    // "Before photo: IMG_2041.jpg", in after on add and in before on remove (spec 0017, AC-18; spec 0018, AC-18)
    const name = attachmentLine(event);
    if (!name) return null;
    return <p className="text-sm break-words text-muted-foreground">{name}</p>;
  }
  if (event.type === 'ATTACHMENT_MOVED') {
    const line = photoMoveLine(event);
    if (!line) return null;
    const file = movedFileName(event);
    return (
      <div className="flex flex-col gap-0.5">
        <p className="text-sm text-foreground">{line}</p>
        {file && <p className="text-xs break-words text-muted-foreground">{file}</p>}
      </div>
    );
  }
  if (event.type === 'TICKET_EDITED' || event.type.startsWith('ISSUE_')) {
    const lines = event.type === 'TICKET_EDITED' ? ticketEditLines(event) : issueEventLines(event);
    // Spec 0021, AC-15: remarks and the cancel reason, clamped to 2 lines with the full text on hover or focus
    const texts = event.type === 'TICKET_EDITED' ? ticketTextLines(event) : [];
    if (lines.length === 0 && texts.length === 0) return null;
    return (
      <ul className="flex flex-col gap-0.5 text-sm break-words text-muted-foreground">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
        {texts.map((line) => (
          <li key={line}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className={cn('line-clamp-2', FOCUSABLE_TEXT)}>
                  {line}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm break-words">{line}</TooltipContent>
            </Tooltip>
          </li>
        ))}
      </ul>
    );
  }
  if (event.type === 'STEP_CHECKED' || event.type === 'STEP_UNCHECKED') {
    const step = stepLine(event);
    if (!step) return null;
    return <p className="text-sm break-words text-muted-foreground">{step}</p>;
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
