import type { PermissionChange, PermissionMatrix } from '../../../lib/api/permissionsApi';

/** How a change row reads (spec 0011, AC-25): a null before is Added, a null after is Removed. */
export function changeVerb(change: Pick<PermissionChange, 'before' | 'after'>): string {
  if (change.before === null) return 'Added';
  if (change.after === null) return 'Removed';
  return change.after ? 'Turned on' : 'Turned off';
}

/** A null actor is System. */
export function changeActor(change: Pick<PermissionChange, 'actorName' | 'actorEmail'>): string {
  return change.actorName ?? change.actorEmail ?? 'System';
}

/** The key's label and the role's label from the matrix, falling back to the raw names. */
export function changeSubject(change: Pick<PermissionChange, 'role' | 'permission'>, matrix: PermissionMatrix | null) {
  const key = matrix?.groups.flatMap((group) => group.keys).find((k) => k.key === change.permission);
  const role = matrix?.roles.find((r) => r.role === change.role);
  return { permission: key?.label ?? change.permission, role: role?.label ?? change.role };
}

/** The read only section shows the last ten (AC-25). */
export const RECENT_CHANGES = 10;
