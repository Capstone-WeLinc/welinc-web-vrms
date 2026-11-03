import type { MechanicOption, MechanicWorkload } from '../../../lib/api/vrmsConfigApi';
import type { ManagedUser } from '../../../types';
import { sortMechanics } from '../../repair/lib/mechanicOrder';
import { getAccountStatus, onMechanicRoster } from './accountStatus';
import { openWorkSummary } from './openWorkCopy';

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
 * Occupied or Free for a person on the mechanic roster, or null: not a mechanic, the workload has
 * not loaded, or the account is deactivated or locked (Free would say they can take work, and they
 * cannot; their open tickets still show in the dialog so an Admin can move them). A mechanic with
 * no row yet (never synced) holds no tickets, so is Free.
 */
export function workStateOf(user: ManagedUser, workload: ReadonlyMap<string, MechanicWorkload> | null): WorkState | null {
  if (!workload || !onMechanicRoster(user)) return null;
  const account = getAccountStatus(user);
  if (account === 'INACTIVE' || account === 'LOCKED') return null;
  return workload.get(user.id)?.occupied ? 'occupied' : 'free';
}

/** "1 in progress, 2 assigned", or "No open tickets". */
export function workloadSummary(work: Pick<MechanicWorkload, 'total' | 'byStatus'> | undefined) {
  if (!work || work.total === 0) return 'No open tickets';
  return openWorkSummary(work.byStatus);
}

/** How many open tickets the dialog lists before "Show all". */
export const TICKETS_SHOWN = 5;

/** The first TICKETS_SHOWN tickets, or all of them once expanded. */
export function visibleTickets<T>(tickets: readonly T[], expanded: boolean): T[] {
  return expanded ? [...tickets] : tickets.slice(0, TICKETS_SHOWN);
}

/** Co-workers on one ticket: up to 3 names in full, else the first 2 and a count of the rest. */
export function coworkerSplit(names: readonly string[]) {
  if (names.length <= 3) return { shown: [...names], hidden: 0 };
  return { shown: names.slice(0, 2), hidden: names.length - 2 };
}

/**
 * "Ana, Ben and 9 more": the first `max` names, then a count. The word after the count is the
 * caller's ("more" in a row, "others" in a sentence). Nobody to name gives an empty string.
 */
export function namesSummary(names: readonly string[], max: number, rest: 'more' | 'others') {
  if (names.length === 0) return '';
  if (names.length <= max + 1) {
    // One extra name is cheaper to show than "+1 more"
    return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  }
  return `${names.slice(0, max).join(', ')} and ${names.length - max} ${rest}`;
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

/** Who the ticket can move to: active mechanics not already on it, fewest open tickets first (the Assign dialog's order). */
export function reassignCandidates(mechanics: readonly MechanicOption[], onTicket: readonly string[]) {
  return sortMechanics(mechanics.filter((m) => !onTicket.includes(m.id)));
}
