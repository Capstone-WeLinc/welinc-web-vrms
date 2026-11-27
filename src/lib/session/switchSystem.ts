import type { User } from '../../types';
import { PORTAL_URL } from './session';

/**
 * Switch system shows with two or more systems, or for a VRMS Admin, whose launcher holds the
 * Admin card even with one system (spec 0007, AC-9 and AC-14). A suite admin's temporary Admin
 * grant counts, so they can get back to the portal to end it. Since spec 0027 step 6a a suite
 * admin always gets it, since the Suite management card is theirs to go to.
 */
export function canSwitchSystem(user: (Pick<User, 'systems' | 'role'> & Partial<Pick<User, 'suiteAdmin'>>) | null): boolean {
  if (!user) return false;
  return (user.systems?.length ?? 0) >= 2 || user.role === 'ADMIN' || user.suiteAdmin === true;
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
 * A card's tag, by the launcher's `roleTag` rule (spec 0027, AC-9a, step 6a): "Admin" when the
 * person holds `ADMIN` there, else the first of their roles there (catalog order) by its catalog
 * name (`label`), from `user.systemRoles`. No entry, or no roles, means no tag.
 */
export function systemRoleTag(
  user: Partial<Pick<User, 'systemRoles'>> | null,
  system: string,
  label: (system: string, role: string) => string,
): string {
  const roles = user?.systemRoles?.find((entry) => entry.system === system)?.roles ?? [];
  if (roles.includes('ADMIN')) return 'Admin';
  return roles[0] ? label(system, roles[0]) : '';
}

/**
 * The Suite management card (spec 0027, AC-9a, step 6a): a suite admin, or anyone holding `ADMIN`
 * in any system, or the VRMS `ADMIN` in `user.roles`, so it still shows while the answer lacks the
 * new fields.
 */
export function holdsAdminAnywhere(user: Partial<Pick<User, 'roles' | 'systemRoles' | 'suiteAdmin'>> | null): boolean {
  if (!user) return false;
  return (
    user.suiteAdmin === true ||
    (user.systemRoles ?? []).some((entry) => entry.roles.includes('ADMIN')) ||
    (user.roles ?? []).some((assignment) => assignment.system === 'VRMS' && assignment.role === 'ADMIN')
  );
}
