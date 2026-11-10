import type { ManagedUser, UserRole } from '../../../types';

// Spec 0006: one derived account status per user (AC-2), never stored. The order is the
// sort rank (AC-5): what stops someone from working comes first. Suite spec 0009, AC-29 adds
// Email not verified after Setup pending; Inactive stays last (decided 2026-11-11).

export const ACCOUNT_STATUSES = ['LOCKED', 'SETUP_PENDING', 'EMAIL_NOT_VERIFIED', 'ACTIVE', 'INACTIVE'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

type StatusFields = Pick<ManagedUser, 'isActive' | 'isLocked' | 'emailVerified' | 'passwordSet'>;

/**
 * The first that applies: Inactive, Locked, Setup pending (no password yet), Email not verified
 * (a password, but the address isn't confirmed: an admin changed it, or it was never checked),
 * Active (suite spec 0009, AC-29).
 */
export function getAccountStatus(user: StatusFields): AccountStatus {
  if (!user.isActive) return 'INACTIVE';
  if (user.isLocked) return 'LOCKED';
  if (!user.passwordSet) return 'SETUP_PENDING';
  if (!user.emailVerified) return 'EMAIL_NOT_VERIFIED';
  return 'ACTIVE';
}

export function statusRank(status: AccountStatus) {
  return ACCOUNT_STATUSES.indexOf(status);
}

/** Status rank, then name ignoring case and accents, then email. */
export function sortUsers(users: ManagedUser[]) {
  return [...users].sort(
    (a, b) =>
      statusRank(getAccountStatus(a)) - statusRank(getAccountStatus(b)) ||
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) ||
      a.email.localeCompare(b.email),
  );
}

/** The user's VRMS roles, in the order the server sent them. */
export function vrmsRoles(user: Pick<ManagedUser, 'roles'>): UserRole[] {
  return user.roles.filter((assignment) => assignment.system === 'VRMS').map((assignment) => assignment.role);
}

/**
 * True when the account is on the mechanic roster (a mechanic or chief mechanic in VRMS). This
 * describes the managed account, not what the signed in user may do.
 */
export function onMechanicRoster(user: Pick<ManagedUser, 'roles'>): boolean {
  return vrmsRoles(user).some((role) => role === 'MECHANIC' || role === 'CHIEF_MECHANIC');
}

/**
 * True when the role control would drop something: more than one VRMS role, or one the catalog
 * doesn't list (`editable`, the VRMS role codes from `GET /auth/systems`). Neither can happen once
 * welinc-auth enforces the catalog (spec 0004, AC-8, AC-10); this stays as a fallback lock.
 */
export function hasUneditableRoles(user: Pick<ManagedUser, 'roles'>, editable: readonly string[]) {
  const roles = vrmsRoles(user);
  return roles.length > 1 || (roles.length === 1 && !editable.includes(roles[0]));
}
