import type { HistoryChange, Setting } from '../../../lib/api/settingsApi';
import { formatAmount } from './thresholds';

// Spec 0012, AC-26: how a change row reads. Permission changes left this history with the
// matrix editor (suite spec 0013, AC-30); they are in the portal's Permissions view.

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
  if (typeof value === 'boolean') return value ? 'On' : 'Off';
  if (typeof value === 'number') return formatAmount(value, unit);
  return String(value);
}

/** What the row shows for the value before and after, with the setting's unit when known. */
export function changeSides(change: HistoryChange, unit?: string): { before: string; after: string } {
  if (change.kind === 'lookup') return lookupSides(change);
  return { before: sideLabel(change, 'before', unit), after: sideLabel(change, 'after', unit) };
}

/**
 * The row's label. A key gone from the catalog comes back labelled with the key itself, so it
 * reads as removed with the key in brackets.
 */
export function changeWhat(change: HistoryChange): string {
  const label = change.label === change.key ? `Removed setting (${change.key})` : change.label;
  if (change.kind === 'lookup' && change.action && change.action !== 'SET' && change.action !== 'RESET') {
    return `${label} (${LOOKUP_ACTION_WORD[change.action]})`;
  }
  return label;
}
