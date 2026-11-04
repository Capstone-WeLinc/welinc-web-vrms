import type { MechanicRosterRow } from '../../../lib/api/vrmsConfigApi';
import { hasNoMechanic } from '../../../lib/mechanicProblem';
import { OPEN_STATUSES } from '../../../lib/repairStatus';
import { isOpen, isOverdue, overdueText, toTime } from '../../../lib/utils/due';
import { statusLabel } from '../../../components/shared/statusLabels';
import type { RepairStatus, RepairTicket } from '../../../types';
import { nameKey, sharedNames } from '../../repair/lib/mechanicOrder';
import { timeInStatus } from './attention';

// Spec 0022: the Team section on the Chief dashboard. Pure, so it tests without a screen.
// Counts, Occupied and the order come from the roster rows; the chips come from the dashboard's
// open tickets joined on mechanicId (never the name). Every rule takes `now` (the fetch time).

/** Chips shown per person before "+N more" (AC-12). */
export const CHIPS_SHOWN = 3;
/** Free names shown before "Show all" (AC-13). */
export const FREE_SHOWN = 6;

export type TeamChip = {
  ticket: RepairTicket;
  /** "On hold · 4 days" */
  text: string;
  /** "Overdue by 2 days" or "Due today" when overdue, else null. */
  overdue: string | null;
};

export type TeamPerson = {
  /** The roster row, or null for a fallback row (a mechanic missing from the roster, AC-15). */
  row: MechanicRosterRow | null;
  key: string;
  name: string;
  chips: TeamChip[];
  /** The "+N more" count: roster total minus the chips shown, when the total is above 3. */
  more: number;
};

export type TeamSummary = { working: number; waiting: number; free: number };

export type Team = {
  /** Open tickets with no mechanic at all (AC-10). */
  noMechanic: RepairTicket[];
  /** Roster people with open work, sorted (AC-11), then fallback rows. */
  people: TeamPerson[];
  /** Active roster people with no open work, by name (AC-13). */
  free: MechanicRosterRow[];
  summary: TeamSummary;
  /** Name keys more than one listed person has; only those rows show the email (AC-12, AC-13). */
  shared: ReadonlySet<string>;
  /** Nobody on the roster but the viewer (AC-13). */
  empty: boolean;
};

/** Open statuses in workflow order, the Users page dialog's order (backend openStatusRank). */
export function openStatusRank(status: RepairStatus) {
  const rank = OPEN_STATUSES.indexOf(status);
  return rank === -1 ? OPEN_STATUSES.length : rank;
}

/** Overdue first, then by openStatusRank, then oldest statusChangedAt, a missing date last (AC-12). */
export function compareChips(now: number) {
  return (a: RepairTicket, b: RepairTicket) => {
    const overdue = Number(isOverdue(b, now)) - Number(isOverdue(a, now));
    if (overdue !== 0) return overdue;
    const rank = openStatusRank(a.status) - openStatusRank(b.status);
    if (rank !== 0) return rank;
    const timeA = toTime(a.statusChangedAt);
    const timeB = toTime(b.statusChangedAt);
    if (timeA === timeB) return 0;
    if (timeA === null) return 1;
    if (timeB === null) return -1;
    return timeA - timeB;
  };
}

export function chipOf(ticket: RepairTicket, now: number): TeamChip {
  return {
    ticket,
    text: `${statusLabel(ticket.status)} · ${timeInStatus(ticket.statusChangedAt, now)}`,
    overdue: isOverdue(ticket, now) ? overdueText(ticket, now) : null,
  };
}

/** "N working · N with work waiting · N free" counts over the roster minus the viewer (AC-7). */
export function teamSummary(roster: readonly MechanicRosterRow[]): TeamSummary {
  let working = 0;
  let waiting = 0;
  let free = 0;
  for (const row of roster) {
    if (row.occupied) working += 1;
    else if (row.total > 0) waiting += 1;
    else if (row.isActive) free += 1;
  }
  return { working, waiting, free };
}

export function summaryText({ working, waiting, free }: TeamSummary) {
  return `${working} working · ${waiting} with work waiting · ${free} free`;
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

/** Inactive first, then anyone with an overdue chip, then highest total, then name (AC-11). */
function comparePeople(a: TeamPerson, b: TeamPerson) {
  const inactive = Number(!b.row?.isActive) - Number(!a.row?.isActive);
  if (inactive !== 0) return inactive;
  const overdue = Number(b.chips.some((c) => c.overdue)) - Number(a.chips.some((c) => c.overdue));
  if (overdue !== 0) return overdue;
  const total = (b.row?.total ?? 0) - (a.row?.total ?? 0);
  if (total !== 0) return total;
  return byName(a, b);
}

/**
 * The whole Team section from one roster read and one ticket fetch. `viewerId` is the signed in
 * user's welinc-auth id; their row is left out everywhere (AC-10).
 */
export function buildTeam(rows: readonly MechanicRosterRow[], active: readonly RepairTicket[], viewerId: string | undefined, now: number): Team {
  const roster = rows.filter((r) => r.authUserId !== viewerId);
  const open = active.filter(isOpen);
  const order = compareChips(now);

  const byMechanic = new Map<string, RepairTicket[]>();
  for (const ticket of open) {
    for (const mechanic of ticket.mechanics ?? []) {
      const list = byMechanic.get(mechanic.id);
      if (list) list.push(ticket);
      else byMechanic.set(mechanic.id, [ticket]);
    }
  }
  const chipsFor = (mechanicId: string) =>
    [...(byMechanic.get(mechanicId) ?? [])].sort(order).map((t) => chipOf(t, now));

  const people = roster
    .filter((row) => row.total > 0)
    .map((row): TeamPerson => {
      const chips = chipsFor(row.mechanicId).slice(0, CHIPS_SHOWN);
      return {
        row,
        key: row.authUserId,
        name: row.name,
        chips,
        more: row.total > CHIPS_SHOWN ? Math.max(0, row.total - chips.length) : 0,
      };
    })
    .sort(comparePeople);

  // AC-15: a ticket whose mechanic is not on the roster yet (sync lag). The viewer's own id is
  // on the roster, so their tickets never land here.
  const known = new Set(rows.map((r) => r.mechanicId));
  const fallback: TeamPerson[] = [];
  for (const [mechanicId, tickets] of byMechanic) {
    if (known.has(mechanicId)) continue;
    const all = chipsFor(mechanicId);
    const name = tickets[0].mechanics?.find((m) => m.id === mechanicId)?.name ?? 'Unknown mechanic';
    fallback.push({ row: null, key: `fallback-${mechanicId}`, name, chips: all.slice(0, CHIPS_SHOWN), more: Math.max(0, all.length - CHIPS_SHOWN) });
  }
  fallback.sort(byName);

  const free = roster.filter((r) => r.isActive && r.total === 0).sort(byName);

  return {
    noMechanic: open.filter(hasNoMechanic).sort(order),
    people: [...people, ...fallback],
    free,
    summary: teamSummary(roster),
    shared: sharedNames([...people, ...fallback, ...free]),
    empty: roster.length === 0,
  };
}

/** The email shows inline only when another listed person shares the name (AC-12, AC-13). */
export function showsEmail(person: { name: string }, shared: ReadonlySet<string>) {
  return shared.has(nameKey(person.name));
}
