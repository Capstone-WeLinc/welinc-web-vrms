import type { User } from '../../types';
import { PORTAL_URL } from './session';

/**
 * Switch system shows with two or more systems, or for a VRMS Admin, whose launcher holds the
 * Admin card even with one system (spec 0007, AC-9 and AC-14). A suite admin's temporary Admin
 * grant counts, so they can get back to the portal to end it.
 */
export function canSwitchSystem(user: Pick<User, 'systems' | 'role'> | null): boolean {
  if (!user) return false;
  return (user.systems?.length ?? 0) >= 2 || user.role === 'ADMIN';
}

/** The portal launcher, with VRMS tagged "You're here" (AC-9, AC-16). */
export function switchSystemUrl(portal: string = PORTAL_URL): string {
  return `${portal.replace(/\/+$/, '')}/?from=VRMS`;
}

/** Spec 0027, AC-9: the launcher starts that system's handoff at once (`open`, AC-13). */
export function openSystemUrl(system: string, portal: string = PORTAL_URL): string {
  return `${switchSystemUrl(portal)}&open=${encodeURIComponent(system)}`;
}

const SYSTEM_ORDER = ['VRMS', 'VMMS', 'BMS'];

/**
 * The switcher menu's systems (spec 0027, AC-9): the person's systems in VRMS, VMMS, BMS order.
 * VRMS is always there (you're in it), and a system code the suite doesn't know is left out.
 */
export function switcherSystems(user: Pick<User, 'systems'> | null): string[] {
  const held = new Set(['VRMS', ...(user?.systems ?? [])]);
  return SYSTEM_ORDER.filter((system) => held.has(system));
}
