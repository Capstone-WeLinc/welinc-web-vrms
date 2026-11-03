import type { ManagedUser } from '../../../types';
import { WORK_FILTERS, type WorkState } from './workload';
import { ACCOUNT_STATUSES, EDITABLE_ROLES, getAccountStatus, vrmsRoles, type AccountStatus, type EditableRole } from './accountStatus';

// Spec 0006: search, role, status and page live in the URL as ?q=&role=&status=&page= (AC-4),
// plus ?work=occupied|free for mechanics (feature 57).
// Defaults are left out of it, and an unknown or malformed value reads as its default.

export type UserFilterValues = {
  /** The search already written (debounced), not the text still being typed. */
  search: string;
  role: 'all' | EditableRole;
  status: 'all' | AccountStatus;
  /** Mechanics only: Occupied or Free (feature 57). */
  work: 'all' | WorkState;
};

export const DEFAULT_USER_FILTERS: UserFilterValues = { search: '', role: 'all', status: 'all', work: 'all' };

export const USERS_PAGE_SIZE = 20;

/** Matches the database's name column; a longer `q` is cut to this when read. */
export const SEARCH_MAX_LENGTH = 100;

/** The search box id; focus falls back here when the row an action started from is gone (AC-9). */
export const USERS_SEARCH_ID = 'users-search';

function readRole(value: string | null): UserFilterValues['role'] {
  return EDITABLE_ROLES.find((role) => role === value) ?? 'all';
}

function readStatus(value: string | null): UserFilterValues['status'] {
  return ACCOUNT_STATUSES.find((status) => status === value) ?? 'all';
}

function readWork(value: string | null): UserFilterValues['work'] {
  return WORK_FILTERS.find((work) => work === value) ?? 'all';
}

function readPage(value: string | null) {
  return value && /^\d+$/.test(value) && Number(value) >= 1 ? Number(value) : 1;
}

export function readUserListState(params: URLSearchParams) {
  const filters: UserFilterValues = {
    search: (params.get('q') ?? '').slice(0, SEARCH_MAX_LENGTH).trim(),
    role: readRole(params.get('role')),
    status: readStatus(params.get('status')),
    work: readWork(params.get('work')),
  };
  return { filters, page: readPage(params.get('page')) };
}

/** The URL for these filters and page, with every default left out. */
export function writeUserListState(filters: UserFilterValues, page: number) {
  const params = new URLSearchParams();
  if (filters.search) params.set('q', filters.search);
  if (filters.role !== 'all') params.set('role', filters.role);
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.work !== 'all') params.set('work', filters.work);
  if (page > 1) params.set('page', String(page));
  return params;
}

export function hasActiveFilters(filters: UserFilterValues) {
  return filters.search !== '' || filters.role !== 'all' || filters.status !== 'all' || filters.work !== 'all';
}

/**
 * Search matches anywhere in the name or email, ignoring case; role matches any VRMS role the user
 * holds. `workState` is the user's Occupied or Free (null when not a mechanic or not loaded), so a
 * work filter shows only mechanics.
 */
export function matchesUserFilters(user: ManagedUser, filters: UserFilterValues, workState: WorkState | null = null) {
  const search = filters.search.toLowerCase();
  if (search && !user.name.toLowerCase().includes(search) && !user.email.toLowerCase().includes(search)) return false;
  if (filters.role !== 'all' && !vrmsRoles(user).includes(filters.role)) return false;
  if (filters.status !== 'all' && getAccountStatus(user) !== filters.status) return false;
  if (filters.work !== 'all' && workState !== filters.work) return false;
  return true;
}
