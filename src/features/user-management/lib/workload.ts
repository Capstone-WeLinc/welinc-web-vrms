import type { MechanicOption, MechanicWorkload } from '../../../lib/api/vrmsConfigApi';
import type { ManagedUser } from '../../../types';
import { onMechanicRoster } from './accountStatus';
import { openWorkSummary, ticketCount } from './openWorkCopy';

// Feature 57: how busy each mechanic is on the Users page. Pure, so it tests without a screen.
// Occupied (at least one In Progress ticket) comes from the server, the same rule as the picker.

export const WORK_FILTERS = ['occupied', 'free'] as const;
export type WorkState = (typeof WORK_FILTERS)[number];

export const WORK_LABELS: Record<WorkState, string> = { occupied: 'Occupied', free: 'Free' };

/** Workload rows keyed by welinc-auth user id. */
export function workloadMap(rows: readonly MechanicWorkload[]) {
  return new Map(rows.map((row) => [row.authUserId, row]));
}

/**
 * Occupied or Free for a person on the mechanic roster, or null: not a mechanic, or the workload
 * has not loaded. A mechanic with no row yet (never synced) holds no tickets, so is Free.
 */
export function workStateOf(user: ManagedUser, workload: ReadonlyMap<string, MechanicWorkload> | null): WorkState | null {
  if (!workload || !onMechanicRoster(user)) return null;
  return workload.get(user.id)?.occupied ? 'occupied' : 'free';
}

/** "1 in progress, 2 assigned", or "No open tickets". */
export function workloadSummary(work: Pick<MechanicWorkload, 'total' | 'byStatus'> | undefined) {
  if (!work || work.total === 0) return 'No open tickets';
  return openWorkSummary(work.byStatus);
}

/** "3 open tickets", for screen readers and the dialog heading. */
export function workloadTotal(work: Pick<MechanicWorkload, 'total'> | undefined) {
  return ticketCount(work?.total ?? 0);
}

/** The ticket's mechanics without this person: what Unassign sends. */
export function withoutMechanic(mechanicIds: readonly string[], mechanicId: string) {
  return mechanicIds.filter((id) => id !== mechanicId);
}

/** The ticket's mechanics with this person swapped for another, in place: what Reassign sends. */
export function swapMechanic(mechanicIds: readonly string[], from: string, to: string) {
  if (mechanicIds.includes(to)) return withoutMechanic(mechanicIds, from);
  return mechanicIds.map((id) => (id === from ? to : id));
}

/**
 * Who the ticket can move to: active mechanics not already on it, Free before Occupied, then the
 * fewest open tickets, then name. The first is the prompt's default, so it is the least loaded.
 */
export function reassignChoices(mechanics: readonly MechanicOption[], onTicket: readonly string[]) {
  return mechanics
    .filter((m) => !onTicket.includes(m.id))
    .sort((a, b) => Number(a.busy) - Number(b.busy) || a.openCount - b.openCount || a.name.localeCompare(b.name))
    .map((m) => ({
      value: m.id,
      label: `${m.name} (${m.openCount} open${m.busy ? ', occupied' : ''})`,
    }));
}
