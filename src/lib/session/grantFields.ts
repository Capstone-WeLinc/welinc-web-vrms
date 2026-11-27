import type { SystemRoles, User } from '../../types';

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

/**
 * `user.systemRoles` from the refresh answer or another tab's message (spec 0027, step 6a): an
 * entry is kept only when `system` is a string and `roles` an array of strings. Missing or
 * malformed reads as `[]`, so an older welinc-auth or an older tab shows cards with no tag.
 */
export function toSystemRoles(value: unknown): SystemRoles[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const { system, roles } = entry as Record<string, unknown>;
    return typeof system === 'string' && isStringArray(roles) ? [{ system, roles: [...roles] }] : [];
  });
}

/** The two display only fields of spec 0027 step 6a, read safely; `suiteAdmin` only when `true`. */
export function withGrantFields<T extends Partial<Pick<User, 'systemRoles' | 'suiteAdmin'>>>(
  user: T,
): T & Pick<User, 'systemRoles' | 'suiteAdmin'> {
  return { ...user, systemRoles: toSystemRoles(user.systemRoles), suiteAdmin: user.suiteAdmin === true };
}
