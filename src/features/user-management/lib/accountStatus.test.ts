import { describe, expect, it } from 'vitest';
import type { TeamMember } from '../../../types';
import { getAccountStatus, isTemporaryRole, sortUsers } from './accountStatus';

// covers: suite spec 0014 task 13a (Active, Inactive and Deleted from VRMS's directory copy, the sort,
// temporary roles)

const base = { isActive: true, deleted: false };

describe('getAccountStatus', () => {
  it('is Active, Inactive or Deleted', () => {
    expect(getAccountStatus(base)).toBe('ACTIVE');
    expect(getAccountStatus({ ...base, isActive: false })).toBe('INACTIVE');
    expect(getAccountStatus({ ...base, deleted: true })).toBe('DELETED');
  });

  it('lets Deleted win over Inactive', () => {
    expect(getAccountStatus({ isActive: false, deleted: true })).toBe('DELETED');
  });
});

describe('sortUsers', () => {
  const user = (name: string, fields: Partial<typeof base>): TeamMember => ({
    id: name,
    name,
    email: `${name}@welinc.com`,
    picture: null,
    roles: [],
    temporaryRoles: [],
    ...base,
    ...fields,
  });

  it('puts Active first, then Inactive, then Deleted, each by name', () => {
    const sorted = sortUsers([
      user('gone', { deleted: true }),
      user('inactive', { isActive: false }),
      user('beta', {}),
      user('alpha', {}),
    ]);
    expect(sorted.map((u) => u.name)).toEqual(['alpha', 'beta', 'inactive', 'gone']);
  });
});

describe('isTemporaryRole', () => {
  it('is true only for a role from a temporary grant', () => {
    const person = { temporaryRoles: ['ADMIN'] } as Pick<TeamMember, 'temporaryRoles'>;
    expect(isTemporaryRole(person, 'ADMIN')).toBe(true);
    expect(isTemporaryRole(person, 'MECHANIC')).toBe(false);
  });
});
