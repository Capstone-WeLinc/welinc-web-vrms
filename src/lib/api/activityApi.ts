import api from './axios';
import type { SystemType } from '../../types';

// Spec 0011: account activity from welinc-auth, the same routes VMMS and BMS read.

export type ActivityCategory = 'SIGN_IN' | 'SESSION' | 'CODE' | 'ACCOUNT';
export type ActorKind = 'SELF' | 'ADMIN' | 'SYSTEM';

/** One event (spec 0011, EventView). Your own view carries the actor only as a kind. */
export interface ActivityEvent {
  id: string;
  category: ActivityCategory;
  type: string;
  reason: string | null;
  system: Exclude<SystemType, 'SHARED'> | null;
  sessionId: string | null;
  client?: string | null;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  attemptsLeft: number | null;
  address: string | null;
  localNetwork: boolean;
  device: string | null;
  userAgent: string | null;
  country: string | null;
  network: string | null;
  createdAt: string;
  actor: { kind: ActorKind; id?: string; name?: string };
}

export interface ActivityPage {
  data: ActivityEvent[];
  nextCursor: string | null;
}

export interface ActivityCatalog {
  categories: { code: ActivityCategory; label: string }[];
  types: { code: string; category: ActivityCategory; label: string; labelAdmin: string }[];
  reasons: { code: string; label: string }[];
}

export interface ActivityQuery {
  cursor?: string | null;
  limit?: number;
  category?: ActivityCategory[];
}

function params(query: ActivityQuery) {
  return {
    ...(query.cursor ? { cursor: query.cursor } : {}),
    ...(query.limit ? { limit: query.limit } : {}),
    ...(query.category && query.category.length > 0 ? { category: query.category.join(',') } : {}),
  };
}

/** Your own events from every system, newest first (AC-11). */
export async function getMyActivity(query: ActivityQuery = {}): Promise<ActivityPage> {
  const response = await api.get<ActivityPage>('/auth/profile/activity', { params: params(query) });
  return response.data;
}

/** The catalog is the same for everyone and changes only with a deploy: fetched once, kept 5 minutes (AC-19). */
const CATALOG_TTL_MS = 5 * 60 * 1000;
let catalogCache: { at: number; value: Promise<ActivityCatalog> } | null = null;

export function getActivityCatalog(now = Date.now()): Promise<ActivityCatalog> {
  if (catalogCache && now - catalogCache.at < CATALOG_TTL_MS) return catalogCache.value;
  const value = api.get<ActivityCatalog>('/auth/activity/catalog').then((r) => r.data);
  catalogCache = { at: now, value };
  // A failed load is not kept, so Retry asks again
  value.catch(() => {
    if (catalogCache?.value === value) catalogCache = null;
  });
  return value;
}

/** One person's events for an admin of this system: tagged with VRMS or account wide (AC-12). */
export async function getUserActivity(userId: string, query: ActivityQuery = {}): Promise<ActivityPage> {
  const response = await api.get<ActivityPage>(`/auth/users/${userId}/activity`, { params: params(query) });
  return response.data;
}
