/**
 * The timing rules of the VRMS web session (spec 0003, AC-22, AC-23, AC-25; suite spec 0016,
 * AC-12). Pure, so they are tested on their own; `session.ts` owns the timers that use them.
 */

/** Real input sends an activity ping at most once a minute (AC-22). */
export const ACTIVITY_GAP_MS = 60_000;
/** The signing out soon banner's status check runs this long before the cutoff (suite spec 0016, AC-12). */
export const IDLE_WARNING_MS = 120_000;
/** The banner speaks the time left once when it opens, and again at this point. */
export const ANNOUNCE_AGAIN_MS = 30_000;
/** A server cutoff this much past the warning point counts as moved, not as clock noise. */
export const CUTOFF_SLACK_MS = 5_000;
/** When a status check can't reach the server, it tries again after this long. */
export const STATUS_RETRY_MS = 15_000;
/** Reconnecting retries at 5, 15 and 30 s, then every 30 s (AC-25). */
const RECONNECT_STEPS_MS = [5_000, 15_000, 30_000];

/**
 * How long to wait before the activity ping for input seen at `now`: 0 sends it now; otherwise
 * one trailing ping goes when the minute since the last ping is up, so input just after a ping
 * still counts.
 */
export function activityDelayMs(lastPingAt: number, now: number): number {
  return Math.max(0, lastPingAt + ACTIVITY_GAP_MS - now);
}

/** When to ask the server for its cutoff: 120 s before the cutoff the app knows, or now. */
export function statusCheckDelayMs(cutoff: number, now: number): number {
  return Math.max(0, cutoff - now - IDLE_WARNING_MS);
}

/**
 * What a status answer means (suite spec 0016, AC-12): a cutoff the server moved past the warning
 * point (work in another tab or system) reschedules quietly; otherwise the banner shows.
 */
export function afterStatus(serverCutoff: number, now: number): 'reschedule' | 'warn' {
  return serverCutoff - now > IDLE_WARNING_MS + CUTOFF_SLACK_MS ? 'reschedule' : 'warn';
}

/** The wait before reconnect attempt `attempt` (0 based). */
export function reconnectDelayMs(attempt: number): number {
  return RECONNECT_STEPS_MS[attempt] ?? RECONNECT_STEPS_MS[RECONNECT_STEPS_MS.length - 1];
}

/** "1:05", "0:09": the banner's countdown. Never below 0:00. */
export function countdown(msLeft: number): string {
  const total = Math.max(0, Math.ceil(msLeft / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * What a screen reader hears when the banner opens and at 30 seconds (suite spec 0016, AC-12):
 * whole minutes while a minute or more is left, else the seconds.
 */
export function spokenTimeLeft(msLeft: number): string {
  const seconds = Math.max(0, Math.ceil(msLeft / 1000));
  if (seconds > ANNOUNCE_AGAIN_MS / 1000 && seconds >= 60) {
    const minutes = Math.round(seconds / 60);
    return `Signing out in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }
  return `Signing out in ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
}
