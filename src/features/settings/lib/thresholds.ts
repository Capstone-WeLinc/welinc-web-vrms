import type { Setting, SettingChange } from '../../../lib/api/settingsApi';

// Spec 0012, AC-23: the Thresholds section's edits, as pure functions so Vitest can run them.

const amountFormat = new Intl.NumberFormat('en-PH');

/** `1,095 days`. A value of 1 takes the singular unit (`1 repair`); the catalog units are plurals. */
export function formatAmount(value: number, unit?: string | null): string {
  const number = amountFormat.format(value);
  if (!unit) return number;
  return `${number} ${value === 1 && unit.endsWith('s') ? unit.slice(0, -1) : unit}`;
}

/** A typed value not saved yet, or a reset back to the default. */
export type ThresholdEdit = { kind: 'value'; text: string } | { kind: 'reset' };
export type ThresholdEdits = Record<string, ThresholdEdit>;

/** The same rules the server checks (AC-6), worded for the field. Null when the text is valid. */
export function thresholdError(setting: Setting, text: string): string | null {
  const trimmed = text.trim();
  if (trimmed === '') return 'Enter a number.';
  if (!/^-?\d+$/.test(trimmed)) return 'Enter a whole number.';
  const value = Number(trimmed);
  if (setting.min != null && setting.max != null && (value < setting.min || value > setting.max)) {
    return `Enter a number from ${formatAmount(setting.min)} to ${formatAmount(setting.max)}.`;
  }
  return null;
}

/** What the field shows: the edit, else the effective value. */
export function shownText(setting: Setting, edit: ThresholdEdit | undefined): string {
  if (edit?.kind === 'reset') return String(setting.default);
  if (edit?.kind === 'value') return edit.text;
  return String(setting.value);
}

/** True when the shown value differs from the default, for the Custom badge. */
export function isCustom(setting: Setting, edit: ThresholdEdit | undefined): boolean {
  if (edit?.kind === 'reset') return false;
  if (edit?.kind === 'value') return edit.text.trim() !== String(setting.default);
  return !setting.isDefault;
}

/**
 * The edits that would change something, as the save body's changes. An edit back to the value
 * already saved is dropped, and so is a reset of a value that is already the default.
 */
export function pendingChanges(settings: Setting[], edits: ThresholdEdits): SettingChange[] {
  const changes: SettingChange[] = [];
  for (const setting of settings) {
    const edit = edits[setting.key];
    if (!edit) continue;
    if (edit.kind === 'reset') {
      if (!setting.isDefault) changes.push({ key: setting.key, reset: true });
      continue;
    }
    if (thresholdError(setting, edit.text) !== null) continue;
    const value = Number(edit.text.trim());
    if (value !== setting.value) changes.push({ key: setting.key, value });
  }
  return changes;
}

/** True when any edited field breaks its rules, which blocks Save. */
export function hasInvalidEdit(settings: Setting[], edits: ThresholdEdits): boolean {
  return settings.some((setting) => {
    const edit = edits[setting.key];
    return edit?.kind === 'value' && thresholdError(setting, edit.text) !== null;
  });
}

/** The values grouped by catalog group, in catalog order. */
export function groupValues(settings: Setting[]): { group: string; settings: Setting[] }[] {
  const groups = new Map<string, Setting[]>();
  for (const setting of settings) {
    if (setting.kind !== 'value') continue;
    groups.set(setting.group, [...(groups.get(setting.group) ?? []), setting]);
  }
  return [...groups].map(([group, list]) => ({ group, settings: list }));
}
