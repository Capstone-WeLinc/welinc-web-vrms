import { describe, expect, it } from 'vitest';
import type { HistoryChange } from '../../../lib/api/settingsApi';
import type { PermissionMatrix } from '../../../lib/api/permissionsApi';
import type { Setting } from '../../../lib/api/settingsApi';
import { actorLabel, changeSides, changeWhat, fromPermissionChange, isLongNote, pendingGrants, removesAny, reviewGrants, unitsByKey } from './changes';
import { formatAmount } from './thresholds';

// Spec 0012, AC-26 and AC-24

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
  it('shows Added and Removed for a null permission side', () => {
    expect(changeSides(row({ kind: 'permission', before: null, after: true }))).toEqual({ before: 'Added', after: 'Allowed' });
    expect(changeSides(row({ kind: 'permission', before: true, after: null }))).toEqual({ before: 'Allowed', after: 'Removed' });
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
  it('adds the role for a permission row', () => {
    expect(changeWhat(row({ roleLabel: 'Mechanic', label: 'Edit entries' }))).toBe('Edit entries for Mechanic');
  });
  it('reads a key gone from the catalog as removed', () => {
    expect(changeWhat(row({ kind: 'permission', key: 'ticket.legacy', label: 'ticket.legacy', roleLabel: 'Mechanic' }))).toBe(
      'Removed permission (ticket.legacy) for Mechanic',
    );
    expect(changeWhat(row({ key: 'old.value', label: 'old.value' }))).toBe('Removed setting (old.value)');
  });
});

const matrix: PermissionMatrix = {
  version: 1,
  roles: [{ role: 'ADMIN', label: 'Admin' }, { role: 'MECHANIC', label: 'Mechanic' }],
  groups: [
    {
      name: 'Tickets',
      keys: [
        { key: 'a', label: 'A', description: '', module: null, grants: { ADMIN: { allowed: true, locked: true }, MECHANIC: { allowed: false, locked: false } } },
      ],
    },
  ],
};

describe('pendingGrants', () => {
  it('keeps only real differences and never a locked cell', () => {
    expect(pendingGrants(matrix, { 'MECHANIC|a': true, 'ADMIN|a': false })).toEqual([{ role: 'MECHANIC', permission: 'a', allowed: true }]);
    expect(pendingGrants(matrix, { 'MECHANIC|a': false })).toEqual([]);
  });
});

describe('fromPermissionChange', () => {
  it('labels from the matrix and falls back to the raw names', () => {
    const base = { id: '1', before: null, after: true, actorName: null, actorEmail: null, note: null, createdAt: 'x' };
    expect(fromPermissionChange({ ...base, role: 'MECHANIC', permission: 'a' }, matrix)).toMatchObject({ label: 'A', roleLabel: 'Mechanic', actor: null });
    expect(fromPermissionChange({ ...base, role: 'X', permission: 'z' }, null)).toMatchObject({ label: 'z', roleLabel: 'X' });
  });
});

describe('reviewGrants and removesAny', () => {
  const wide: PermissionMatrix = {
    version: 1,
    roles: [{ role: 'ADMIN', label: 'Admin' }, { role: 'CHIEF_MECHANIC', label: 'Chief Mechanic' }, { role: 'MECHANIC', label: 'Mechanic' }],
    groups: [
      {
        name: 'Tickets',
        keys: [
          { key: 'a', label: 'See every ticket', description: '', module: null, grants: {} },
          { key: 'b', label: 'Encode costs', description: '', module: null, grants: {} },
        ],
      },
    ],
  };

  it('lists each role once, in matrix order, with its gains and losses split', () => {
    const changes = [
      { role: 'MECHANIC', permission: 'a', allowed: false },
      { role: 'CHIEF_MECHANIC', permission: 'b', allowed: true },
      { role: 'CHIEF_MECHANIC', permission: 'a', allowed: false },
    ];
    expect(reviewGrants(wide, changes)).toEqual([
      { role: 'Chief Mechanic', gains: ['Encode costs'], losses: ['See every ticket'] },
      { role: 'Mechanic', gains: [], losses: ['See every ticket'] },
    ]);
  });

  it('skips a role with no changes and names an unknown key by itself', () => {
    expect(reviewGrants(wide, [])).toEqual([]);
    expect(reviewGrants(wide, [{ role: 'ADMIN', permission: 'gone', allowed: true }])).toEqual([{ role: 'Admin', gains: ['gone'], losses: [] }]);
  });

  it('asks for a reason only when a right is taken away', () => {
    expect(removesAny([])).toBe(false);
    expect(removesAny([{ role: 'MECHANIC', permission: 'a', allowed: true }])).toBe(false);
    expect(removesAny([{ role: 'MECHANIC', permission: 'a', allowed: true }, { role: 'MECHANIC', permission: 'b', allowed: false }])).toBe(true);
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
