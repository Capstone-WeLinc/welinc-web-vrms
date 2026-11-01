import type { HistoryChange, Setting } from '../../../lib/api/settingsApi';
import type { PermissionChange, PermissionMatrix } from '../../../lib/api/permissionsApi';
import { formatAmount } from './thresholds';

// Spec 0012, AC-26: how a change row reads.

export const HISTORY_PAGE_SIZE = 20;
export const RECENT_COUNT = 3;
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

const LOOKUP_ACTION_WORD = { CREATE: 'Added', RENAME: 'Renamed', DEACTIVATE: 'Deactivated', REACTIVATE: 'Reactivated' } as const;

/** A lookup row: a rename shows the old and new name, anything else the state before and after (spec 0016, AC-20). */
function lookupSides(change: HistoryChange): { before: string; after: string } {
  const name = (value: HistoryChange['before']) => (value && typeof value === 'object' ? value.name : '');
  switch (change.action) {
    case 'RENAME':
      return { before: name(change.before), after: name(change.after) };
    case 'DEACTIVATE':
      return { before: 'Active', after: 'Inactive' };
    case 'REACTIVATE':
      return { before: 'Inactive', after: 'Active' };
    default:
      return { before: 'Not in the list', after: 'Active' };
  }
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
  if (change.kind === 'lookup') return lookupSides(change);
  return { before: sideLabel(change, 'before', unit), after: sideLabel(change, 'after', unit) };
}

/**
 * The label, plus the role for a permission row. A key gone from the catalog comes back labelled
 * with the key itself, so it reads as removed with the key in brackets.
 */
export function changeWhat(change: HistoryChange): string {
  const label = change.label === change.key ? `Removed ${change.kind === 'permission' ? 'permission' : 'setting'} (${change.key})` : change.label;
  if (change.kind === 'lookup' && change.action && change.action !== 'SET' && change.action !== 'RESET') {
    return `${label} (${LOOKUP_ACTION_WORD[change.action]})`;
  }
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

export type GrantChange = { role: string; permission: string; allowed: boolean };

export function pendingGrants(matrix: PermissionMatrix, edits: MatrixEdits) {
  const changes: GrantChange[] = [];
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

/** One review line per pending change, grouped by role in matrix order: who gains or loses what. */
export function reviewGrants(matrix: PermissionMatrix, changes: GrantChange[]) {
  const labels = new Map(matrix.groups.flatMap((group) => group.keys).map((k) => [k.key, k.label]));
  return matrix.roles
    .map((role) => ({
      role: role.label,
      gains: changes.filter((c) => c.role === role.role && c.allowed).map((c) => labels.get(c.permission) ?? c.permission),
      losses: changes.filter((c) => c.role === role.role && !c.allowed).map((c) => labels.get(c.permission) ?? c.permission),
    }))
    .filter((r) => r.gains.length > 0 || r.losses.length > 0);
}

/** Taking a right away needs a reason, like a module switch (AC-8); adding one keeps the note optional. */
export const removesAny = (changes: GrantChange[]) => changes.some((c) => !c.allowed);
