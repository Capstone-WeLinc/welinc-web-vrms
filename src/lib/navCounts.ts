import { useEffect, useSyncExternalStore } from 'react';
import { getNavCounts } from './api/navApi';
import type { NavCounts } from '../components/layout/navItems';

// VRMS spec 0027, AC-7: the sidebar counts load with the shell, refresh every 60 seconds while the
// tab is visible, on focus when the last read is older than 15 seconds, and right after the
// viewer's own ticket moves and suggestion reviews (`refreshNavCounts`). A failed read keeps the
// last numbers and shows nothing; after a failure on the first read no bubbles show. The counts
// belong to one person: another person signed in on this tab starts from none.
// Its own timer, like the permissions poll: this is not page data, so `useVisiblePoll` (3 s) doesn't fit.

export const NAV_COUNTS_REFRESH_MS = 60_000;
export const NAV_COUNTS_FOCUS_AFTER_MS = 15_000;

const NONE: NavCounts = {};

let counts: NavCounts = NONE;
let owner: string | null = null;
let readAt = 0;
let reading = false;
let again = false;
let timer: number | undefined;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function sameCounts(a: NavCounts, b: NavCounts) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof NavCounts>;
  return [...keys].every((key) => a[key] === b[key]);
}

/** Reads the counts now; a call during a read runs once more after it, so no move is missed. */
export function refreshNavCounts(): void {
  // No sidebar for a signed in person yet (sign in, tests): nothing to refresh.
  if (owner === null) return;
  if (reading) {
    again = true;
    return;
  }
  reading = true;
  const asked = owner;
  getNavCounts()
    .then((next) => {
      if (asked !== owner) return;
      readAt = Date.now();
      if (!sameCounts(counts, next)) {
        counts = next;
        emit();
      }
    })
    .catch(() => {
      // Keep the last numbers; the next tick or focus tries again
    })
    .finally(() => {
      reading = false;
      if (again) {
        again = false;
        refreshNavCounts();
      }
    });
}

function onTick() {
  if (owner !== null && document.visibilityState === 'visible') refreshNavCounts();
}

function onFocus() {
  if (Date.now() - readAt > NAV_COUNTS_FOCUS_AFTER_MS) refreshNavCounts();
}

function start() {
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onFocus);
  timer = window.setInterval(onTick, NAV_COUNTS_REFRESH_MS);
  if (owner !== null) refreshNavCounts();
}

function stop() {
  window.removeEventListener('focus', onFocus);
  document.removeEventListener('visibilitychange', onFocus);
  window.clearInterval(timer);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== 'undefined') start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== 'undefined') stop();
  };
}

/** Points the store at the signed in person; a change drops the last person's numbers. */
function own(userId: string | null) {
  if (owner === userId) return;
  owner = userId;
  readAt = 0;
  if (counts !== NONE) {
    counts = NONE;
    emit();
  }
  refreshNavCounts();
}

/** The sidebar's counts for this person (AC-5, AC-7). */
export function useNavCounts(userId: string | null): NavCounts {
  useEffect(() => own(userId), [userId]);
  return useSyncExternalStore(
    subscribe,
    () => counts,
    () => counts,
  );
}

export function setNavCountsForTest(next: NavCounts | null, userId: string | null = null): void {
  owner = userId;
  counts = next ?? NONE;
  readAt = next ? Date.now() : 0;
  emit();
}

export function readNavCountsForTest(): NavCounts {
  return counts;
}
