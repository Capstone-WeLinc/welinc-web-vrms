import { describe, expect, it } from 'vitest';
import type { HistoryChange } from '../../../lib/api/settingsApi';
import type { Setting } from '../../../lib/api/settingsApi';
import { actorLabel, changeSides, changeWhat, isLongNote, unitsByKey } from './changes';
import { formatAmount } from './thresholds';

// Spec 0012, AC-26. Permission rows left this history with suite spec 0013 (AC-30).

const row = (over: Partial<HistoryChange>): HistoryChange => ({
  id: '1',
  kind: 'setting',
  key: 'k',
  label: 'Label',
  roleLabel: null,
  before: 3,
  after: 4,
  action: 'SET',
  actor: null,
  note: null,
  createdAt: '2026-10-30T00:00:00Z',
  ...over,
});

describe('changeSides', () => {
  it('names the default a reset went back to', () => {
    expect(changeSides(row({ action: 'RESET', before: 5, after: 3 }))).toEqual({ before: '5', after: '3 (default)' });
    expect(changeSides(row({ action: 'RESET', before: 20, after: 3 }), 'repairs')).toEqual({ before: '20 repairs', after: '3 repairs (default)' });
    expect(changeSides(row({ action: 'RESET', before: false, after: true })).after).toBe('On (default)');
  });
  it('shows a module as On or Off', () => {
    expect(changeSides(row({ before: true, after: false }))).toEqual({ before: 'On', after: 'Off' });
  });
  it('shows Added and Removed for a null side', () => {
    expect(changeSides(row({ before: null, after: 4 }))).toEqual({ before: 'Added', after: '4' });
    expect(changeSides(row({ before: 4, after: null }))).toEqual({ before: '4', after: 'Removed' });
  });
  it('formats numbers and adds the unit when known', () => {
    expect(changeSides(row({ before: 365, after: 1095 }), 'days')).toEqual({ before: '365 days', after: '1,095 days' });
    expect(changeSides(row({ before: 25000, after: 999999 }))).toEqual({ before: '25,000', after: '999,999' });
  });
});

describe('formatAmount', () => {
  it('uses the singular unit for exactly 1', () => {
    expect(formatAmount(1, 'repairs')).toBe('1 repair');
    expect(formatAmount(0, 'repairs')).toBe('0 repairs');
    expect(formatAmount(1, 'percent')).toBe('1 percent');
    expect(formatAmount(1000000)).toBe('1,000,000');
  });
});

describe('unitsByKey and isLongNote', () => {
  it('maps only value settings that have a unit', () => {
    const settings = [
      { key: 'a', kind: 'value', unit: 'days' },
      { key: 'module.ai', kind: 'module', unit: null },
    ] as Setting[];
    expect(unitsByKey(settings)).toEqual({ a: 'days' });
  });
  it('clamps a long note or one with a line break', () => {
    expect(isLongNote('Gemini quota ran out')).toBe(false);
    expect(isLongNote('x'.repeat(161))).toBe(true);
    expect(isLongNote('Line one\nLine two')).toBe(true);
  });
});

describe('actorLabel and changeWhat', () => {
  it('shows a null actor as System', () => {
    expect(actorLabel(null)).toBe('System');
    expect(actorLabel({ name: null, email: 'a@b.c' })).toBe('a@b.c');
  });
  it('reads a key gone from the catalog as removed', () => {
    expect(changeWhat(row({ key: 'old.value', label: 'old.value' }))).toBe('Removed setting (old.value)');
    expect(changeWhat(row({ label: 'Repairs before typical time and cost' }))).toBe('Repairs before typical time and cost');
  });
});

// Spec 0016, AC-20: lookup list changes in the same feed
describe('lookup rows', () => {
  const lookup = (over: Partial<HistoryChange>) =>
    row({ kind: 'lookup', key: 'lookup.vehicle_type', label: 'Vehicle types: Reefer', ...over });

  it('shows a rename as the old and new name, with the action named', () => {
    const change = lookup({ action: 'RENAME', before: { name: 'Trailer', isActive: true }, after: { name: 'Reefer', isActive: true } });
    expect(changeSides(change)).toEqual({ before: 'Trailer', after: 'Reefer' });
    expect(changeWhat(change)).toBe('Vehicle types: Reefer (Renamed)');
  });

  it('shows add, deactivate and reactivate as states', () => {
    expect(changeSides(lookup({ action: 'CREATE', before: null, after: { name: 'Reefer', isActive: true } })).after).toBe('Active');
    expect(changeSides(lookup({ action: 'DEACTIVATE' }))).toEqual({ before: 'Active', after: 'Inactive' });
    expect(changeSides(lookup({ action: 'REACTIVATE' }))).toEqual({ before: 'Inactive', after: 'Active' });
    expect(changeWhat(lookup({ action: 'CREATE' }))).toBe('Vehicle types: Reefer (Added)');
  });
});
