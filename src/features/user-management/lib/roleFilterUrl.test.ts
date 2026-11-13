import { describe, expect, it } from 'vitest';
import { onMechanicRoster, vrmsRoles } from './accountStatus';
import { DEFAULT_USER_FILTERS, hasActiveFilters, readUserListState, writeUserListState } from './userFilters';
import type { TeamMember } from '../../../types';

// Spec 0004, AC-20: the role filter lives in the URL as a catalog role code, so a role added to
// welinc-auth's catalog filters and survives a reload with no web change.

function roles(list: { role: string; system: 'VRMS' | 'VMMS' | 'BMS' }[]) {
  return { roles: list as TeamMember['roles'] };
}

describe('role filter in the URL', () => {
  it('writes a catalog role and reads it back (AC-20)', () => {
    const filters = { ...DEFAULT_USER_FILTERS, role: 'SERVICE_ADVISOR' };
    const params = writeUserListState(filters, 1);
    expect(params.get('role')).toBe('SERVICE_ADVISOR');
    expect(readUserListState(params).filters.role).toBe('SERVICE_ADVISOR');
  });

  it('leaves the role out of the URL when it is all (AC-20)', () => {
    expect(writeUserListState(DEFAULT_USER_FILTERS, 1).has('role')).toBe(false);
  });

  it('counts a role as an active filter, so it can be cleared (AC-20)', () => {
    expect(hasActiveFilters({ ...DEFAULT_USER_FILTERS, role: 'MECHANIC' })).toBe(true);
    expect(hasActiveFilters(DEFAULT_USER_FILTERS)).toBe(false);
  });

  it('rejects a role code that is too long for the catalog rule (AC-20)', () => {
    const tooLong = 'A'.repeat(41);
    expect(readUserListState(new URLSearchParams({ role: tooLong })).filters.role).toBe('all');
  });
});

describe('vrmsRoles and onMechanicRoster', () => {
  it('reads only the VRMS roles, in the order sent (AC-17)', () => {
    const user = roles([
      { role: 'OPERATIONS', system: 'VMMS' },
      { role: 'CHIEF_MECHANIC', system: 'VRMS' },
    ]);
    expect(vrmsRoles(user)).toEqual(['CHIEF_MECHANIC']);
  });

  it('puts mechanics and chief mechanics on the roster, nobody else', () => {
    expect(onMechanicRoster(roles([{ role: 'MECHANIC', system: 'VRMS' }]))).toBe(true);
    expect(onMechanicRoster(roles([{ role: 'CHIEF_MECHANIC', system: 'VRMS' }]))).toBe(true);
    expect(onMechanicRoster(roles([{ role: 'ADMIN', system: 'VRMS' }]))).toBe(false);
  });

  it('ignores a mechanic role held in another system', () => {
    expect(onMechanicRoster(roles([{ role: 'MECHANIC', system: 'VMMS' }]))).toBe(false);
  });
});
