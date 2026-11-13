import { describe, expect, it } from 'vitest';
import { hasUneditableRoles } from './accountStatus';
import { matchesUserFilters, readUserListState } from './userFilters';
import type { TeamMember } from '../../../types';

// Spec 0004, AC-20: the role filter and the fallback lock follow welinc-auth's catalog, not a
// fixed list in the web app.

const CATALOG = ['ADMIN', 'CHIEF_MECHANIC', 'MECHANIC'];

function user(roles: { role: string; system: 'VRMS' | 'VMMS' }[]): TeamMember {
  return {
    id: 'pedro',
    name: 'Pedro',
    email: 'pedro@welinc.com',
    picture: null,
    isActive: true,
    deleted: false,
    roles: roles as TeamMember['roles'],
    temporaryRoles: [],
  };
}

describe('role filter from the URL', () => {
  it('keeps any well formed role code, so a new catalog role filters with no web change', () => {
    expect(readUserListState(new URLSearchParams('role=SERVICE_ADVISOR')).filters.role).toBe('SERVICE_ADVISOR');
  });

  it.each(['mechanic', 'M', 'ADMIN;DROP', ''])('reads %j as all roles', (value) => {
    expect(readUserListState(new URLSearchParams({ role: value })).filters.role).toBe('all');
  });

  it('matches only the VRMS role', () => {
    const filters = { search: '', role: 'MECHANIC', status: 'all', work: 'all' } as const;
    expect(matchesUserFilters(user([{ role: 'MECHANIC', system: 'VRMS' }]), filters)).toBe(true);
    expect(matchesUserFilters(user([{ role: 'MECHANIC', system: 'VMMS' }]), filters)).toBe(false);
  });
});

describe('hasUneditableRoles', () => {
  it('is false for one catalog role', () => {
    expect(hasUneditableRoles(user([{ role: 'CHIEF_MECHANIC', system: 'VRMS' }]), CATALOG)).toBe(false);
  });

  it('locks a role the catalog does not list, and more than one VRMS role', () => {
    expect(hasUneditableRoles(user([{ role: 'DRIVER', system: 'VRMS' }]), CATALOG)).toBe(true);
    expect(
      hasUneditableRoles(
        user([
          { role: 'ADMIN', system: 'VRMS' },
          { role: 'MECHANIC', system: 'VRMS' },
        ]),
        CATALOG,
      ),
    ).toBe(true);
  });

  it('ignores roles in other systems', () => {
    expect(hasUneditableRoles(user([{ role: 'MECHANIC', system: 'VRMS' }, { role: 'OPERATIONS', system: 'VMMS' }]), CATALOG)).toBe(false);
  });
});
