import type { ManagedUser, UserRole } from '../../../types';

// Spec 0006: one derived account status per user (AC-2), never stored. The order is the
// sort rank (AC-5): what stops someone from working comes first.

export const ACCOUNT_STATUSES = ['LOCKED', 'SETUP_PENDING', 'ACTIVE', 'INACTIVE'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/** The roles this page can set. */
export const EDITABLE_ROLES = ['ADMIN', 'CHIEF_MECHANIC', 'MECHANIC'] as const;
export type EditableRole = (typeof EDITABLE_ROLES)[number];

type StatusFields = Pick<ManagedUser, 'isActive' | 'isLocked' | 'emailVerified'>;

/** The first that applies: Inactive, Locked, Setup pending, Active. */
export function getAccountStatus(user: StatusFields): AccountStatus {
  if (!user.isActive) return 'INACTIVE';
  if (user.isLocked) return 'LOCKED';
  if (!user.emailVerified) return 'SETUP_PENDING';
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

export function isEditableRole(role: string): role is EditableRole {
  return (EDITABLE_ROLES as readonly string[]).includes(role);
}

/** True when the role control would drop something: more than one VRMS role, or one this page can't set. */
export function hasUneditableRoles(user: Pick<ManagedUser, 'roles'>) {
  const roles = vrmsRoles(user);
  return roles.length > 1 || (roles.length === 1 && !isEditableRole(roles[0]));
}
