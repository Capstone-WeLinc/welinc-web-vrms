import type { MechanicRosterRow } from '../../../lib/api/vrmsConfigApi';
import type { RepairStatus } from '../../../types';
import { SEARCH_MAX_LENGTH } from '../../user-management/lib/userFilters';
import { WORK_FILTERS, type WorkState } from '../../user-management/lib/workload';

// Spec 0022: the Mechanics screen's list rules. Pure, so they test without a screen.

/** The counts each row shows, in workflow order (AC-6). */
export const COUNTED_STATUSES: RepairStatus[] = ['ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'FOR_VERIFICATION'];

export type MechanicsFilters = {
  /** The search already written to the URL (debounced). */
  search: string;
  work: 'all' | WorkState;
};

export const DEFAULT_MECHANICS_FILTERS: MechanicsFilters = { search: '', work: 'all' };

/** AC-7: `?q=` and `?work=`; an unknown work value reads as All. */
export function readMechanicsFilters(params: URLSearchParams): MechanicsFilters {
  const work = params.get('work');
  return {
    search: (params.get('q') ?? '').slice(0, SEARCH_MAX_LENGTH).trim(),
    work: WORK_FILTERS.find((w) => w === work) ?? 'all',
  };
}

/** The URL for these filters, with defaults left out. */
export function writeMechanicsFilters(filters: MechanicsFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set('q', filters.search);
  if (filters.work !== 'all') params.set('work', filters.work);
  return params;
}

export function hasMechanicsFilters(filters: MechanicsFilters) {
  return filters.search !== '' || filters.work !== 'all';
}

export function workStateOfRow(row: Pick<MechanicRosterRow, 'occupied'>): WorkState {
  return row.occupied ? 'occupied' : 'free';
}

/** AC-7: the name contains the search (any case), and the work state matches. */
export function matchesMechanicsFilters(row: MechanicRosterRow, filters: MechanicsFilters) {
  if (filters.search && !row.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
  if (filters.work !== 'all' && workStateOfRow(row) !== filters.work) return false;
  return true;
}

/** AC-8: active before inactive, then Free first, then fewest open tickets, then name. */
export function compareRoster(a: MechanicRosterRow, b: MechanicRosterRow) {
  if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
  if (a.occupied !== b.occupied) return a.occupied ? 1 : -1;
  if (a.total !== b.total) return a.total - b.total;
  return a.name.localeCompare(b.name);
}

export function sortRoster(rows: readonly MechanicRosterRow[]): MechanicRosterRow[] {
  return [...rows].sort(compareRoster);
}

/**
 * AC-8: the rows in the order fixed earlier. Known people keep their place, people no longer in
 * `rows` drop out, and new people go to the end (sorted among themselves).
 */
export function keepOrder(rows: readonly MechanicRosterRow[], order: readonly string[]): MechanicRosterRow[] {
  const byId = new Map(rows.map((row) => [row.authUserId, row]));
  const kept = order.flatMap((id) => byId.get(id) ?? []);
  const known = new Set(order);
  return [...kept, ...sortRoster(rows.filter((row) => !known.has(row.authUserId)))];
}

/** AC-8: "Sort again" shows when the shown order is not what a fresh sort would give. */
export function needsSortAgain(shown: readonly MechanicRosterRow[]) {
  const sorted = sortRoster(shown);
  return shown.some((row, i) => row.authUserId !== sorted[i].authUserId);
}

export function idsOf(rows: readonly MechanicRosterRow[]) {
  return rows.map((row) => row.authUserId);
}

export function sameIds(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}
