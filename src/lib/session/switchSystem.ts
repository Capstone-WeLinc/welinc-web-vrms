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

const portalBase = (portal: string) => portal.replace(/\/+$/, '');

/** The portal launcher, with VRMS tagged "You're here" (AC-9, AC-16): the switcher's Home pill. */
export function switchSystemUrl(portal: string = PORTAL_URL): string {
  return `${portalBase(portal)}/?from=VRMS`;
}

/** Spec 0027, AC-9a: the launcher starts that system's handoff at once (`open`, AC-13). */
export function openSystemUrl(system: string, portal: string = PORTAL_URL): string {
  return `${switchSystemUrl(portal)}&open=${encodeURIComponent(system)}`;
}

/** Spec 0027, AC-9a: the switcher's Suite management card. */
export function suiteManagementUrl(portal: string = PORTAL_URL): string {
  return `${portalBase(portal)}/admin`;
}

/** The other systems' cards come in this order, after VRMS (spec 0027, AC-9a). */
const OTHER_SYSTEMS = ['BMS', 'VMMS'];

/**
 * The switcher's cards after VRMS (spec 0027, AC-9a): the person's other systems from
 * `user.systems` (the list `canSwitchSystem` reads), BMS then VMMS. A code the suite doesn't know
 * is left out.
 */
export function otherSystems(user: Pick<User, 'systems'> | null): string[] {
  const held = new Set(user?.systems ?? []);
  return OTHER_SYSTEMS.filter((system) => held.has(system));
}

/**
 * A card's tag, by the launcher's `roleTag` rule: "Admin" when you hold `ADMIN` there, else the
 * first of your roles there in the session answer, by its catalog name (`label`).
 */
export function systemRoleTag(
  user: Pick<User, 'roles'> | null,
  system: string,
  label: (system: string, role: string) => string,
): string {
  const held = (user?.roles ?? []).filter((assignment) => assignment.system === system);
  if (held.some((assignment) => assignment.role === 'ADMIN')) return 'Admin';
  return held[0] ? label(system, held[0].role) : '';
}

/** The Suite management card shows for anyone holding `ADMIN` in any system (spec 0007's rule). */
export function holdsAdminAnywhere(user: Pick<User, 'roles'> | null): boolean {
  return (user?.roles ?? []).some((assignment) => assignment.role === 'ADMIN');
}
