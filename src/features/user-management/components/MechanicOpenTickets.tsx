import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { confirm } from '../../../components/shared/confirm/confirm';
import { PlateChip } from '../../../components/shared/PlateChip';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { useToast } from '../../../context/toast';
import { getApiErrorMessage, getApiErrorStatus } from '../../../lib/api/errors';
import { setMechanics } from '../../../lib/api/repairApi';
import {
  getMechanicOpenTickets,
  type MechanicOpenTicket,
  type MechanicOpenTickets as OpenTicketsData,
  type MechanicOption,
} from '../../../lib/api/vrmsConfigApi';
import { useCan } from '../../../lib/permissions/usePermissions';
import type { TeamMember } from '../../../types';
import { coworkerSplit, namesSummary, swapMechanic, TICKETS_SHOWN, visibleTickets, withoutMechanic } from '../lib/workload';
import { ReassignDialog } from './ReassignDialog';

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: OpenTicketsData };

interface MechanicOpenTicketsProps {
  /** The person whose tickets these are: their welinc-auth id and name (the Users page or the Team section). */
  user: Pick<TeamMember, 'id' | 'name'>;
  /** After an unassign or reassign lands, so the page's Work column catches up. */
  onChanged: () => void;
  /** The section's spacing; the Team dialog drops the divider the Users page dialog needs. */
  className?: string;
}

/** What Unassign does to the ticket, in words, before the Admin confirms. */
function unassignEffect(ticket: MechanicOpenTicket, mechanicId: string) {
  const others = ticket.mechanics.filter((m) => m.id !== mechanicId);
  if (others.length > 0) return `${namesSummary(others.map((m) => m.name), 3, 'others')} stay on it.`;
  if (ticket.repairStatus === 'ASSIGNED') return 'It goes back to Open for someone else to pick up.';
  return 'It will have no mechanic until someone is added.';
}

/** "with Ana, Ben and 9 more", where the count opens the full list (a title alone never reaches touch or keyboard). */
function CoWorkers({ names }: { names: string[] }) {
  const [open, setOpen] = useState(false);
  const { shown, hidden } = coworkerSplit(names);
  if (hidden === 0) return <span> · with {namesSummary(shown, 2, 'more')}</span>;
  return (
    <span>
      {' · with '}
      {open ? names.join(', ') : `${shown.join(', ')} and `}
      <button
        type="button"
        aria-expanded={open}
        className="inline-flex min-h-11 items-center underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-0"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? 'fewer' : `${hidden} more`}
      </button>
    </span>
  );
}

/**
 * Feature 57: the mechanic's open tickets in the Edit user dialog, each with Unassign and
 * Reassign. Both go through PUT /vrms/repairs/:id/assignments, which runs the status moves, the
 * verifier block, the audit rows and the stale check (spec 0019).
 */
export function MechanicOpenTickets({ user, onChanged, className = 'mt-5 border-t border-border pt-4' }: MechanicOpenTicketsProps) {
  const { showToast } = useToast();
  const canAssign = useCan('ticket.assign');
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [reassigning, setReassigning] = useState<MechanicOpenTicket | null>(null);
  const [showAll, setShowAll] = useState(false);
  const listId = useId();
  // Focus lands here after a change, because the row that was acted on may be gone
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let cancelled = false;
    getMechanicOpenTickets(user.id).then(
      (data) => {
        if (!cancelled) setState({ status: 'ready', data });
      },
      (err: unknown) => {
        if (!cancelled) setState({ status: 'error', message: getApiErrorMessage(err, 'Couldn’t load their open tickets.') });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [user.id, attempt]);

  const reload = () => setAttempt((n) => n + 1);

  const save = async (ticket: MechanicOpenTicket, mechanicIds: string[], done: string) => {
    setSavingId(ticket.id);
    try {
      await setMechanics(ticket.id, mechanicIds, { lastUpdatedAt: ticket.updatedAt });
      showToast(done);
      onChanged();
      headingRef.current?.focus();
    } catch (err) {
      showToast(
        getApiErrorStatus(err) === 409
          ? `${ticket.repairNumber} changed since this list loaded. Check it and try again.`
          : getApiErrorMessage(err, 'Couldn’t change the mechanics on this ticket.'),
        'error',
      );
    } finally {
      setSavingId(null);
      reload();
    }
  };

  const unassign = async (ticket: MechanicOpenTicket, mechanicId: string) => {
    const ok = await confirm({
      title: `Unassign ${user.name}?`,
      description: `They come off ${ticket.repairNumber}. ${unassignEffect(ticket, mechanicId)}`,
      confirmText: 'Unassign',
      tone: 'destructive',
    });
    if (!ok) return;
    const ids = ticket.mechanics.map((m) => m.id);
    await save(ticket, withoutMechanic(ids, mechanicId), `${user.name} unassigned from ${ticket.repairNumber}.`);
  };

  // The dialog saves through the same path as Unassign, so it gets the same stale check and toasts
  const reassign = async (ticket: MechanicOpenTicket, to: MechanicOption) => {
    const mechanicId = state.status === 'ready' ? state.data.mechanicId : null;
    if (!mechanicId) return;
    const ids = ticket.mechanics.map((m) => m.id);
    await save(ticket, swapMechanic(ids, mechanicId, to.id), `${ticket.repairNumber} moved from ${user.name} to ${to.name}.`);
    setReassigning(null);
  };

  return (
    <section aria-labelledby="open-tickets-heading" className={cn('flex flex-col gap-2', className)}>
      <h3
        id="open-tickets-heading"
        ref={headingRef}
        tabIndex={-1}
        className="rounded-sm text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Open tickets
        {state.status === 'ready' && (
          <span className="ml-2 font-normal text-muted-foreground">({state.data.tickets.length})</span>
        )}
      </h3>

      {state.status === 'loading' && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading their open tickets…
        </p>
      )}

      {state.status === 'error' && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-destructive">{state.message}</span>
          <Button type="button" variant="outline" size="sm" onClick={reload}>
            Try again
          </Button>
        </div>
      )}

      {state.status === 'ready' && state.data.tickets.length === 0 && (
        <p role="status" className="text-sm text-muted-foreground">
          They have no open tickets.
        </p>
      )}

      {state.status === 'ready' && state.data.mechanicId && state.data.tickets.length > 0 && (
        <ul id={listId} className="flex flex-col divide-y divide-border">
          {visibleTickets(state.data.tickets, showAll).map((ticket) => {
            const mechanicId = state.data.mechanicId!;
            const others = ticket.mechanics.filter((m) => m.id !== mechanicId);
            return (
              <li key={ticket.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <PlateChip plate={ticket.plateNumber} />
                    <StatusBadge status={ticket.repairStatus} />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <Link to={`/repairs/${ticket.id}`} className="whitespace-nowrap underline-offset-4 hover:underline">
                      {ticket.repairNumber}
                    </Link>
                    {others.length > 0 && <CoWorkers names={others.map((m) => m.name)} />}
                  </span>
                </div>
                {canAssign && (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="touch"
                      className="flex-1 sm:flex-none md:h-9 md:text-sm"
                      disabled={savingId !== null}
                      loading={savingId === ticket.id}
                      aria-label={`Reassign ${ticket.repairNumber}`}
                      onClick={() => setReassigning(ticket)}
                    >
                      Reassign
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="touch"
                      className="flex-1 sm:flex-none md:h-9 md:text-sm"
                      disabled={savingId !== null}
                      aria-label={`Unassign ${user.name} from ${ticket.repairNumber}`}
                      onClick={() => void unassign(ticket, mechanicId)}
                    >
                      Unassign
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {state.status === 'ready' && state.data.tickets.length > TICKETS_SHOWN && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11 self-start md:min-h-0"
          aria-expanded={showAll}
          aria-controls={listId}
          onClick={() => setShowAll((all) => !all)}
        >
          {showAll ? 'Show fewer' : `Show all ${state.data.tickets.length}`}
        </Button>
      )}

      <ReassignDialog
        ticket={reassigning}
        fromName={user.name}
        finalFocusRef={headingRef}
        onOpenChange={(open) => !open && setReassigning(null)}
        onSubmit={reassign}
      />
    </section>
  );
}
