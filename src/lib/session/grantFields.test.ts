import { describe, it, expect } from 'vitest';
import { toSystemRoles, withGrantFields } from './grantFields';

// covers: spec 0027 step 6a (systemRoles and suiteAdmin read safely at every hop)
describe('the grant answer fields', () => {
  it('keeps well formed systemRoles entries as they came', () => {
    expect(
      toSystemRoles([
        { system: 'VMMS', roles: ['ADMIN'] },
        { system: 'VRMS', roles: [] },
      ]),
    ).toEqual([
      { system: 'VMMS', roles: ['ADMIN'] },
      { system: 'VRMS', roles: [] },
    ]);
  });

  it('reads a missing or malformed systemRoles as [] and drops bad entries', () => {
    expect(toSystemRoles(undefined)).toEqual([]);
    expect(toSystemRoles('VMMS')).toEqual([]);
    expect(
      toSystemRoles([
        null,
        'VMMS',
        { system: 3, roles: ['ADMIN'] },
        { system: 'BMS', roles: 'ADMIN' },
        { system: 'VMMS', roles: ['ADMIN', 7] },
        { system: 'VRMS', roles: ['MECHANIC'] },
      ]),
    ).toEqual([{ system: 'VRMS', roles: ['MECHANIC'] }]);
  });

  it('takes suiteAdmin only when it is true, so an older tab or welinc-auth reads false', () => {
    expect(withGrantFields({ suiteAdmin: true }).suiteAdmin).toBe(true);
    for (const suiteAdmin of [undefined, 'true', 1, null, false]) {
      expect(withGrantFields({ suiteAdmin: suiteAdmin as boolean | undefined }).suiteAdmin).toBe(false);
    }
    const olderTabUser: { id: string; suiteAdmin?: boolean } = { id: 'u1' };
    expect(withGrantFields(olderTabUser)).toEqual({ id: 'u1', systemRoles: [], suiteAdmin: false });
  });
});
