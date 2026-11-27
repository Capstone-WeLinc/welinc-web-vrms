import type { TeamMember, UserRole } from '../../../types';

// Spec 0006: one derived account status per user (AC-2), never stored, and the order is the sort
// rank (AC-5). Suite spec 0014 (task 13a): the page reads VRMS's directory copy, which knows only
// Active, Inactive and Deleted; Locked, Setup pending and Email not verified live on the portal's
// person page, behind Manage account.

export const ACCOUNT_STATUSES = ['ACTIVE', 'INACTIVE', 'DELETED'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

type StatusFields = Pick<TeamMember, 'isActive' | 'deleted'>;

/** Deleted (in the grace period) first, then Inactive, else Active. */
export function getAccountStatus(user: StatusFields): AccountStatus {
  if (user.deleted) return 'DELETED';
  if (!user.isActive) return 'INACTIVE';
  return 'ACTIVE';
}

export function statusRank(status: AccountStatus) {
  return ACCOUNT_STATUSES.indexOf(status);
}

/** Status rank, then name ignoring case and accents, then email. */
export function sortUsers(users: TeamMember[]) {
  return [...users].sort(
    (a, b) =>
      statusRank(getAccountStatus(a)) - statusRank(getAccountStatus(b)) ||
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) ||
      a.email.localeCompare(b.email),
  );
}

/** The user's VRMS roles, in the order the server sent them. */
export function vrmsRoles(user: Pick<TeamMember, 'roles'>): UserRole[] {
  return user.roles.filter((assignment) => assignment.system === 'VRMS').map((assignment) => assignment.role);
}

/** True when the person holds this VRMS role only through a temporary grant. */
export function isTemporaryRole(user: Pick<TeamMember, 'temporaryRoles'>, role: UserRole): boolean {
  return user.temporaryRoles.includes(role);
}

/**
 * True when the account is on the mechanic roster: the workload list has a row for them (suite
 * spec 0018 child 0002, AC-34: roster membership, decided on the server by ticket.assignable, never
 * by a role code). This describes the managed account, not what the signed in user may do.
 */
export function onMechanicRoster(
  user: Pick<TeamMember, 'id'>,
  workload: ReadonlyMap<string, unknown> | null,
): boolean {
  return workload?.has(user.id) ?? false;
}

/**
 * True when the role control would drop something: more than one VRMS role, or one the catalog
 * doesn't list (`editable`, the VRMS role codes from `GET /auth/systems`). Neither can happen once
 * welinc-auth enforces the catalog (spec 0004, AC-8, AC-10); this stays as a fallback lock.
 */
export function hasUneditableRoles(user: Pick<TeamMember, 'roles'>, editable: readonly string[]) {
  const roles = vrmsRoles(user);
  return roles.length > 1 || (roles.length === 1 && !editable.includes(roles[0]));
}
