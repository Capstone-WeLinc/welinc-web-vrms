import { describe, expect, it } from 'vitest';
import type { HistoryChange } from '../../../lib/api/settingsApi';
import type { PermissionMatrix } from '../../../lib/api/permissionsApi';
import { actorLabel, changeSides, changeWhat, fromPermissionChange, pendingGrants } from './changes';

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
  it('shows Default after a reset', () => {
    expect(changeSides(row({ action: 'RESET', before: 5, after: 3 }))).toEqual({ before: '5', after: 'Default' });
  });
  it('shows a module as On or Off', () => {
    expect(changeSides(row({ before: true, after: false }))).toEqual({ before: 'On', after: 'Off' });
  });
  it('shows Added and Removed for a null permission side', () => {
    expect(changeSides(row({ kind: 'permission', before: null, after: true }))).toEqual({ before: 'Added', after: 'Allowed' });
    expect(changeSides(row({ kind: 'permission', before: true, after: null }))).toEqual({ before: 'Allowed', after: 'Removed' });
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
