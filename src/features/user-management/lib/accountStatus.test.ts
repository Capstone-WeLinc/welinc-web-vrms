import { describe, expect, it } from 'vitest';
import type { ManagedUser } from '../../../types';
import { getAccountStatus, sortUsers } from './accountStatus';

// covers: suite spec 0009 AC-29 (Setup pending from passwordSet, the new Email not verified, the sort)

const base = { isActive: true, isLocked: false, emailVerified: true, passwordSet: true };

describe('getAccountStatus', () => {
  it('reads Setup pending from passwordSet, not emailVerified', () => {
    expect(getAccountStatus({ ...base, passwordSet: false, emailVerified: false })).toBe('SETUP_PENDING');
    expect(getAccountStatus({ ...base, passwordSet: false, emailVerified: true })).toBe('SETUP_PENDING');
  });

  it('is Email not verified when there is a password but the address is not confirmed', () => {
    expect(getAccountStatus({ ...base, emailVerified: false })).toBe('EMAIL_NOT_VERIFIED');
  });

  it('lets Inactive, then Locked, win over both', () => {
    expect(getAccountStatus({ ...base, isActive: false, passwordSet: false })).toBe('INACTIVE');
    expect(getAccountStatus({ ...base, isLocked: true, emailVerified: false })).toBe('LOCKED');
    expect(getAccountStatus(base)).toBe('ACTIVE');
  });
});

describe('sortUsers', () => {
  const user = (name: string, fields: Partial<typeof base>): ManagedUser => ({
    id: name,
    name,
    email: `${name}@welinc.com`,
    lockedAt: null,
    createdAt: '',
    updatedAt: '',
    roles: [],
    ...base,
    ...fields,
  });

  it('puts Email not verified after Setup pending and keeps Inactive last', () => {
    const sorted = sortUsers([
      user('active', {}),
      user('inactive', { isActive: false }),
      user('unverified', { emailVerified: false }),
      user('pending', { passwordSet: false }),
      user('locked', { isLocked: true }),
    ]);
    expect(sorted.map((u) => u.name)).toEqual(['locked', 'pending', 'unverified', 'active', 'inactive']);
  });
});
