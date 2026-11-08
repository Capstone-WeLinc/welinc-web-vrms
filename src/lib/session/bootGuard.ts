/**
 * The boot loop guard (spec 0001 section 7, spec 0003 AC-20). The one thing VRMS keeps in browser
 * storage: a timestamp in `sessionStorage`, never a token. It marks "we already went to the login
 * once", so a second 401 after coming back goes to the portal instead of looping.
 */
export const BOOT_FLAG = 'vrms_boot_attempt';
/** A flag older than this is ignored, so a tab that comes back later starts fresh. */
export const BOOT_FLAG_MAX_AGE_MS = 2 * 60_000;

/** True when a login trip started less than 2 minutes ago. */
export function isFreshAttempt(raw: string | null, now: number): boolean {
  if (!raw) return false;
  const at = Number(raw);
  return Number.isFinite(at) && at <= now && now - at < BOOT_FLAG_MAX_AGE_MS;
}

/** What the boot does after a 401 from refresh. */
export function afterBootRefused(raw: string | null, now: number): 'start' | 'give_up' {
  return isFreshAttempt(raw, now) ? 'give_up' : 'start';
}

/** When to refresh: 60 s before the access token runs out, never sooner than 5 s from now. */
export function refreshDelayMs(expiresAt: number, now: number): number {
  return Math.max(5_000, expiresAt - now - 60_000);
}

/** The path, query and hash the login comes back to (AC-20: a deep link survives). */
export function returnPath(location: Pick<Location, 'pathname' | 'search' | 'hash'>): string {
  return `${location.pathname}${location.search}${location.hash}`;
}
