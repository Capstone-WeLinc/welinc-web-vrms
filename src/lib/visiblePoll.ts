// Spec 0019, AC-21: the one refetch rhythm for the repair detail page, the repair list and the
// dashboard. A constant, not a setting.

/** VR-RL-12: a reassignment shows on the mechanic's screen within 3 seconds. */
export const TICKET_POLL_MS = 3_000;
/** The slower rhythm after repeated failures, so a down server is not hammered. */
export const POLL_BACKOFF_MS = 15_000;
/** Failures in a row before the poll slows down; the next success speeds it up again. */
export const POLL_BACKOFF_AFTER = 3;

/** How long to wait before the next refetch, given the failures in a row so far. */
export function pollDelay(failuresInARow: number): number {
  return failuresInARow >= POLL_BACKOFF_AFTER ? POLL_BACKOFF_MS : TICKET_POLL_MS;
}

/**
 * Whether a background refetch may replace what is on screen: never an older version (a save
 * that answered first wins), and never an identical one (nothing on the page needs to change).
 */
export function isNewer<T extends { updatedAt: string }>(current: T, fetched: T): boolean {
  const now = Date.parse(current.updatedAt);
  const next = Date.parse(fetched.updatedAt);
  if (next < now) return false;
  return JSON.stringify(current) !== JSON.stringify(fetched);
}
