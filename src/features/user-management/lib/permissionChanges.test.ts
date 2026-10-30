import { describe, expect, it } from 'vitest';
import type { PermissionMatrix } from '../../../lib/api/permissionsApi';
import { changeActor, changeSubject, changeVerb } from './permissionChanges';

// Spec 0011, AC-25

describe('changeVerb', () => {
  it('reads a null before as Added and a null after as Removed', () => {
    expect(changeVerb({ before: null, after: true })).toBe('Added');
    expect(changeVerb({ before: true, after: null })).toBe('Removed');
  });

  it('reads an edit as turned on or off', () => {
    expect(changeVerb({ before: false, after: true })).toBe('Turned on');
    expect(changeVerb({ before: true, after: false })).toBe('Turned off');
  });
});

describe('changeActor', () => {
  it('shows a null actor as System', () => {
    expect(changeActor({ actorName: null, actorEmail: null })).toBe('System');
    expect(changeActor({ actorName: 'Victor Ramos', actorEmail: 'v@welinc.com' })).toBe('Victor Ramos');
  });
});

describe('changeSubject', () => {
  const matrix: PermissionMatrix = {
    roles: [{ role: 'CHIEF_MECHANIC', label: 'Chief Mechanic' }],
    groups: [{ name: 'Records', keys: [{ key: 'analytics.view', label: 'See the Analytics page', description: '', module: 'analytics', grants: {} }] }],
    version: 1,
  };

  it('uses the labels, and the raw names for a key that left the catalog', () => {
    expect(changeSubject({ role: 'CHIEF_MECHANIC', permission: 'analytics.view' }, matrix)).toEqual({
      permission: 'See the Analytics page',
      role: 'Chief Mechanic',
    });
    expect(changeSubject({ role: 'MECHANIC', permission: 'old.key' }, matrix)).toEqual({ permission: 'old.key', role: 'MECHANIC' });
  });
});
