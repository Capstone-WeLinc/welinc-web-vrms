import type { RepairListParams } from '../../../lib/api/repairApi';
import { readRepairView, type RepairView } from './repairViews';

// Spec 0004: the list's filters and page live in the URL (AC-5). Defaults are left out of it,
// and an unknown or malformed value reads as its default.

// The open statuses a ticket can reach today (spec 0010); the rest arrive with feature 16
export const OPEN_STATUS_FILTERS = ['ASSIGNED', 'IN_PROGRESS', 'FOR_VERIFICATION'] as const;
export type OpenStatusFilter = 'all' | (typeof OPEN_STATUS_FILTERS)[number];

export type RepairListFilterValues = {
  /** The search already sent (debounced), not the text still being typed. */
  search: string;
  status: OpenStatusFilter;
  /** A garage id, or 'all'. */
  garageId: string;
  /** A mechanic id, or 'all'. Admins only. */
  mechanicId: string;
  overdue: boolean;
  /** Spec 0029, AC-35: only open tickets whose truck VMMS removed (`?removed=1`). */
  truckRemoved: boolean;
  /** Spec 0027, AC-4: the sidebar sub page this list is (`?view=`), or none. */
  view: RepairView | null;
};

export const DEFAULT_REPAIR_LIST_FILTERS: RepairListFilterValues = {
  search: '',
  status: 'all',
  garageId: 'all',
  mechanicId: 'all',
  overdue: false,
  truckRemoved: false,
  view: null,
};

export const REPAIR_LIST_PAGE_SIZE = 20;

/** The server's limit on `search`; a longer `q` in the URL reads as no search. */
export const SEARCH_MAX_LENGTH = 100;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readId(value: string | null) {
  return value && UUID.test(value) ? value : 'all';
}

function readStatus(value: string | null): OpenStatusFilter {
  return OPEN_STATUS_FILTERS.find((status) => status === value) ?? 'all';
}

function readPage(value: string | null) {
  return value && /^\d+$/.test(value) && Number(value) >= 1 ? Number(value) : 1;
}

/**
 * AC-4: picking another status clears the preset (it would contradict it); other filters keep it.
 */
export function withFilterPatch(filters: RepairListFilterValues, patch: Partial<RepairListFilterValues>): RepairListFilterValues {
  const next = { ...filters, ...patch };
  if (patch.status !== undefined && patch.status !== filters.status && patch.view === undefined) next.view = null;
  return next;
}

/** Filters and page from the URL. A list of only your own tickets ignores `mechanic`. */
export function readListState(params: URLSearchParams, seesAll: boolean) {
  const search = params.get('q')?.trim() ?? '';
  const filters: RepairListFilterValues = {
    search: search.length <= SEARCH_MAX_LENGTH ? search : '',
    status: readStatus(params.get('status')),
    garageId: readId(params.get('garage')),
    mechanicId: seesAll ? readId(params.get('mechanic')) : 'all',
    overdue: params.get('overdue') === '1',
    truckRemoved: params.get('removed') === '1',
    view: readRepairView(params.get('view')),
  };
  return { filters, page: readPage(params.get('page')) };
}

/** The URL for these filters and page, with every default left out. */
export function writeListState(filters: RepairListFilterValues, page: number) {
  const params = new URLSearchParams();
  if (filters.view) params.set('view', filters.view);
  if (filters.search) params.set('q', filters.search);
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.garageId !== 'all') params.set('garage', filters.garageId);
  if (filters.overdue) params.set('overdue', '1');
  if (filters.truckRemoved) params.set('removed', '1');
  if (filters.mechanicId !== 'all') params.set('mechanic', filters.mechanicId);
  if (page > 1) params.set('page', String(page));
  return params;
}

export function hasActiveFilters(filters: RepairListFilterValues) {
  return (
    filters.search !== '' ||
    filters.status !== 'all' ||
    filters.garageId !== 'all' ||
    filters.mechanicId !== 'all' ||
    filters.overdue ||
    filters.truckRemoved
  );
}

export function repairListParams(filters: RepairListFilterValues, page: number): RepairListParams {
  return {
    search: filters.search || undefined,
    status: filters.status === 'all' ? undefined : filters.status,
    garageId: filters.garageId === 'all' ? undefined : filters.garageId,
    mechanicId: filters.mechanicId === 'all' ? undefined : filters.mechanicId,
    overdue: filters.overdue || undefined,
    truckRemoved: filters.truckRemoved || undefined,
    page,
    limit: REPAIR_LIST_PAGE_SIZE,
  };
}
