import { useSyncExternalStore } from 'react';

/*
  Suite spec 0016 AC-12 (design.md, Feedback: Banners). The offline signal behind the offline and
  back online banners: the browser's online and offline events plus the shared API client's
  answers. A network error, or two 5xx answers in a row, counts as offline; it stays until a
  request succeeds (or the browser reports online again). Leaving offline shows "Back online"
  for BACK_ONLINE_MS.
*/
export const BACK_ONLINE_MS = 4000;
const FAILURES_FOR_OFFLINE = 2;

export type ConnectionState = {
  offline: boolean;
  /** Epoch ms until which "Back online" shows, or null. */
  backOnlineUntil: number | null;
};

let state: ConnectionState = { offline: false, backOnlineUntil: null };
let serverFailures = 0;
let backOnlineTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function set(next: ConnectionState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function goOffline() {
  if (backOnlineTimer) clearTimeout(backOnlineTimer);
  backOnlineTimer = null;
  if (!state.offline || state.backOnlineUntil !== null) set({ offline: true, backOnlineUntil: null });
}

function goOnline(now = Date.now()) {
  serverFailures = 0;
  if (!state.offline) return;
  set({ offline: false, backOnlineUntil: now + BACK_ONLINE_MS });
  backOnlineTimer = setTimeout(() => {
    backOnlineTimer = null;
    set({ ...state, backOnlineUntil: null });
  }, BACK_ONLINE_MS);
}

/** Called by the API client on every answer it gets. */
export function reportRequestOk() {
  goOnline();
}

/**
 * Called by the API client on every failed request. `status` is the HTTP status, or undefined
 * when no answer came back (a network error). A cancelled request never counts.
 */
export function reportRequestFailed(status: number | undefined, cancelled = false) {
  if (cancelled) return;
  if (status === undefined) {
    goOffline();
    return;
  }
  if (status >= 500) {
    serverFailures += 1;
    if (serverFailures >= FAILURES_FOR_OFFLINE) goOffline();
    return;
  }
  // Any other answer means the server is reachable
  goOnline();
}

if (typeof window !== 'undefined') {
  window.addEventListener('offline', goOffline);
  window.addEventListener('online', () => goOnline());
  if (window.navigator.onLine === false) state = { offline: true, backOnlineUntil: null };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getConnection() {
  return state;
}

export function useConnection() {
  return useSyncExternalStore(subscribe, getConnection, getConnection);
}

/** Tests only: back to a fresh online state. */
export function resetConnectionForTests() {
  if (backOnlineTimer) clearTimeout(backOnlineTimer);
  backOnlineTimer = null;
  serverFailures = 0;
  state = { offline: false, backOnlineUntil: null };
}
