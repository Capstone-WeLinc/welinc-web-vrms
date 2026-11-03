import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { confirm, confirmChoice } from '../../../components/shared/confirm/confirm';
import { PlateChip } from '../../../components/shared/PlateChip';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { useToast } from '../../../context/toast';
import { getApiErrorMessage, getApiErrorStatus } from '../../../lib/api/errors';
import { setMechanics } from '../../../lib/api/repairApi';
import {
  getAvailableMechanics,
  getMechanicOpenTickets,
  type MechanicOpenTicket,
  type MechanicOpenTickets as OpenTicketsData,
} from '../../../lib/api/vrmsConfigApi';
import { useCan } from '../../../lib/permissions/usePermissions';
import type { ManagedUser } from '../../../types';
import { reassignChoices, swapMechanic, withoutMechanic, workloadTotal } from '../lib/workload';

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: OpenTicketsData };

interface MechanicOpenTicketsProps {
  user: ManagedUser;
  /** After an unassign or reassign lands, so the page's Work column catches up. */
  onChanged: () => void;
}

/** What Unassign does to the ticket, in words, before the Admin confirms. */
function unassignEffect(ticket: MechanicOpenTicket, mechanicId: string) {
  const others = ticket.mechanics.filter((m) => m.id !== mechanicId);
  if (others.length > 0) return `${others.map((m) => m.name).join(', ')} stay on it.`;
  if (ticket.repairStatus === 'ASSIGNED') return 'It goes back to Open for someone else to pick up.';
  return 'It will have no mechanic until someone is added.';
}

/**
 * Feature 57: the mechanic's open tickets in the Edit user dialog, each with Unassign and
 * Reassign. Both go through PUT /vrms/repairs/:id/assignments, which runs the status moves, the
 * verifier block, the audit rows and the stale check (spec 0019).
 */
export function MechanicOpenTickets({ user, onChanged }: MechanicOpenTicketsProps) {
  const { showToast } = useToast();
  const canAssign = useCan('ticket.assign');
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);

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

  const reassign = async (ticket: MechanicOpenTicket, mechanicId: string) => {
    setSavingId(ticket.id);
    let choices: { value: string; label: string }[];
    try {
      const ids = ticket.mechanics.map((m) => m.id);
      choices = reassignChoices(await getAvailableMechanics(), ids);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Couldn’t load the mechanics.'), 'error');
      return;
    } finally {
      setSavingId(null);
    }
    if (choices.length === 0) {
      showToast('No other mechanic is available for this ticket.', 'info');
      return;
    }
    const to = await confirmChoice({
      title: `Reassign ${ticket.repairNumber}`,
      description: `Move it from ${user.name} to another mechanic. The least busy is picked first.`,
      confirmText: 'Reassign',
      choices,
    });
    if (!to) return;
    const name = choices.find((c) => c.value === to)?.label.replace(/ \(.*$/, '') ?? 'the new mechanic';
    const ids = ticket.mechanics.map((m) => m.id);
    await save(ticket, swapMechanic(ids, mechanicId, to), `${ticket.repairNumber} moved from ${user.name} to ${name}.`);
  };

  return (
    <section aria-labelledby="open-tickets-heading" className="flex flex-col gap-2 border-t border-border pt-4">
      <h3 id="open-tickets-heading" className="text-sm font-semibold">
        Open tickets
        {state.status === 'ready' && (
          <span className="ml-2 font-normal text-muted-foreground">{workloadTotal({ total: state.data.tickets.length })}</span>
        )}
      </h3>

      {state.status === 'loading' && <p className="text-sm text-muted-foreground">Loading their open tickets…</p>}

      {state.status === 'error' && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-destructive">{state.message}</span>
          <Button type="button" variant="outline" size="sm" onClick={reload}>
            Try again
          </Button>
        </div>
      )}

      {state.status === 'ready' && state.data.tickets.length === 0 && (
        <p className="text-sm text-muted-foreground">They have no open tickets.</p>
      )}

      {state.status === 'ready' && state.data.mechanicId && state.data.tickets.length > 0 && (
        <ul className="flex flex-col divide-y divide-border">
          {state.data.tickets.map((ticket) => {
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
                    {others.length > 0 && <> · with {others.map((m) => m.name).join(', ')}</>}
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
                      onClick={() => void reassign(ticket, mechanicId)}
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
    </section>
  );
}
