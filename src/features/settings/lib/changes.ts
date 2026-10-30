import type { HistoryChange } from '../../../lib/api/settingsApi';
import type { PermissionChange, PermissionMatrix } from '../../../lib/api/permissionsApi';

// Spec 0012, AC-26: how a change row reads.

export const HISTORY_PAGE_SIZE = 20;
export const RECENT_COUNT = 5;

/** A null actor is System. */
export function actorLabel(actor: HistoryChange['actor']): string {
  return actor?.name ?? actor?.email ?? 'System';
}

function sideLabel(change: HistoryChange, side: 'before' | 'after'): string {
  const value = change[side];
  if (side === 'after' && change.action === 'RESET') return 'Default';
  if (value === null) return side === 'before' ? 'Added' : 'Removed';
  if (typeof value === 'boolean') return change.kind === 'permission' ? (value ? 'Allowed' : 'Not allowed') : value ? 'On' : 'Off';
  return String(value);
}

/** What the row shows for the value before and after. */
export function changeSides(change: HistoryChange): { before: string; after: string } {
  return { before: sideLabel(change, 'before'), after: sideLabel(change, 'after') };
}

/** The label, plus the role for a permission row. */
export function changeWhat(change: HistoryChange): string {
  return change.roleLabel ? `${change.label} for ${change.roleLabel}` : change.label;
}

/** A matrix change in the same shape as the merged history, labelled from the matrix. */
export function fromPermissionChange(change: PermissionChange, matrix: PermissionMatrix | null): HistoryChange {
  const key = matrix?.groups.flatMap((group) => group.keys).find((k) => k.key === change.permission);
  const role = matrix?.roles.find((r) => r.role === change.role);
  return {
    id: change.id,
    kind: 'permission',
    key: change.permission,
    label: key?.label ?? change.permission,
    roleLabel: role?.label ?? change.role,
    before: change.before,
    after: change.after,
    action: null,
    actor: change.actorName || change.actorEmail ? { name: change.actorName, email: change.actorEmail } : null,
    note: change.note,
    createdAt: change.createdAt,
  };
}

/** Matrix edits keyed `role|permission` against what is stored: only real differences count. */
export type MatrixEdits = Record<string, boolean>;

export const cellKey = (role: string, permission: string) => `${role}|${permission}`;

export function pendingGrants(matrix: PermissionMatrix, edits: MatrixEdits) {
  const changes: { role: string; permission: string; allowed: boolean }[] = [];
  for (const group of matrix.groups) {
    for (const key of group.keys) {
      for (const role of matrix.roles) {
        const grant = key.grants[role.role];
        const edited = edits[cellKey(role.role, key.key)];
        if (grant && !grant.locked && edited !== undefined && edited !== grant.allowed) {
          changes.push({ role: role.role, permission: key.key, allowed: edited });
        }
      }
    }
  }
  return changes;
}
