import type { HistoryChange, Setting } from '../../../lib/api/settingsApi';
import type { PermissionChange, PermissionMatrix } from '../../../lib/api/permissionsApi';
import { formatAmount } from './thresholds';

// Spec 0012, AC-26: how a change row reads.

export const HISTORY_PAGE_SIZE = 20;
export const RECENT_COUNT = 5;
/** A longer note, or one with a line break, starts clamped to two lines with Show more. */
export const NOTE_PREVIEW = 160;

export function isLongNote(note: string): boolean {
  return note.length > NOTE_PREVIEW || note.includes('\n');
}

/** Each value setting's unit, so a change row reads `365 days`, not `365`. */
export function unitsByKey(settings: Setting[]): Record<string, string> {
  return Object.fromEntries(settings.filter((s) => s.kind === 'value' && s.unit).map((s) => [s.key, s.unit as string]));
}

/** A null actor is System. */
export function actorLabel(actor: HistoryChange['actor']): string {
  return actor?.name ?? actor?.email ?? 'System';
}

function sideLabel(change: HistoryChange, side: 'before' | 'after', unit: string | undefined): string {
  const value = change[side];
  // A reset stores the default it went back to, so the row names it
  if (side === 'after' && change.action === 'RESET') return value === null ? 'Default' : `${sideLabel({ ...change, action: 'SET' }, side, unit)} (default)`;
  if (value === null) return side === 'before' ? 'Added' : 'Removed';
  if (typeof value === 'boolean') return change.kind === 'permission' ? (value ? 'Allowed' : 'Not allowed') : value ? 'On' : 'Off';
  if (typeof value === 'number') return formatAmount(value, unit);
  return String(value);
}

/** What the row shows for the value before and after, with the setting's unit when known. */
export function changeSides(change: HistoryChange, unit?: string): { before: string; after: string } {
  return { before: sideLabel(change, 'before', unit), after: sideLabel(change, 'after', unit) };
}

/**
 * The label, plus the role for a permission row. A key gone from the catalog comes back labelled
 * with the key itself, so it reads as removed with the key in brackets.
 */
export function changeWhat(change: HistoryChange): string {
  const label = change.label === change.key ? `Removed ${change.kind === 'permission' ? 'permission' : 'setting'} (${change.key})` : change.label;
  return change.roleLabel ? `${label} for ${change.roleLabel}` : label;
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
