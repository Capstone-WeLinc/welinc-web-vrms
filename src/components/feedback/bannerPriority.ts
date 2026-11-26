/*
  Suite spec 0016 AC-12 (design.md, Feedback: Banners): one banner shows at a time, by priority:
  offline, then reconnecting, then the no access note, then back online. A lower one waits until
  the higher one ends. Signing out soon is a toast now (suite spec 0019, AC-25), shown alongside.
*/
export type BannerSlot = 'offline' | 'reconnecting' | 'noAccess' | 'backOnline';

const ORDER: BannerSlot[] = ['offline', 'reconnecting', 'noAccess', 'backOnline'];

export function pickBanner(active: Partial<Record<BannerSlot, boolean>>): BannerSlot | null {
  return ORDER.find((slot) => active[slot]) ?? null;
}

/** How long the no access note shows before it closes on its own. */
export const NO_ACCESS_MS = 8000;
