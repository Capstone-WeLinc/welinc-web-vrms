import { describe, it, expect, vi } from 'vitest';

vi.mock('./session', () => ({ PORTAL_URL: 'http://localhost:8000' }));

import {
  canSwitchSystem,
  holdsAdminAnywhere,
  openSystemUrl,
  otherSystems,
  suiteManagementUrl,
  switchSystemUrl,
  systemRoleTag,
} from './switchSystem';

// covers: spec 0007 AC-8, AC-9, AC-14
describe('Switch system', () => {
  it('shows with two or more systems, and an older answer counts as none', () => {
    expect(canSwitchSystem(null)).toBe(false);
    expect(canSwitchSystem({ systems: [], role: 'MECHANIC' })).toBe(false);
    expect(canSwitchSystem({ systems: ['VRMS'], role: 'CHIEF_MECHANIC' })).toBe(false);
    expect(canSwitchSystem({ systems: ['VMMS', 'VRMS'], role: 'MECHANIC' })).toBe(true);
    expect(canSwitchSystem({ systems: undefined as unknown as string[], role: 'MECHANIC' })).toBe(false);
  });

  it('shows for a one system VRMS Admin, whose launcher holds the Admin card (AC-14)', () => {
    expect(canSwitchSystem({ systems: ['VRMS'], role: 'ADMIN' })).toBe(true);
  });

  it('opens the portal launcher with from=VRMS', () => {
    expect(switchSystemUrl()).toBe('http://localhost:8000/?from=VRMS');
    expect(switchSystemUrl('https://portal.test/')).toBe('https://portal.test/?from=VRMS');
  });
});

// covers: spec 0027 AC-9a
describe('the system switcher cards', () => {
  const label = (system: string, role: string) => `${system} ${role.toLowerCase()}`;

  it('opens another system straight through the launcher, Suite management at /admin', () => {
    expect(openSystemUrl('VMMS')).toBe('http://localhost:8000/?from=VRMS&open=VMMS');
    expect(openSystemUrl('BMS', 'https://portal.test/')).toBe('https://portal.test/?from=VRMS&open=BMS');
    expect(suiteManagementUrl()).toBe('http://localhost:8000/admin');
    expect(suiteManagementUrl('https://portal.test/')).toBe('https://portal.test/admin');
  });

  it('lists the other systems BMS then VMMS, from user.systems, never VRMS or an unknown code', () => {
    expect(otherSystems({ systems: ['VMMS', 'VRMS', 'BMS'] })).toEqual(['BMS', 'VMMS']);
    expect(otherSystems({ systems: ['VRMS', 'VMMS'] })).toEqual(['VMMS']);
    expect(otherSystems({ systems: ['VRMS', 'XYZ'] })).toEqual([]);
    expect(otherSystems(null)).toEqual([]);
  });

  // covers: spec 0027 step 6a (the tags and the card read user.systemRoles and user.suiteAdmin)
  it('tags a card Admin when you hold ADMIN there, else your first role there by its name', () => {
    const user = {
      systemRoles: [
        { system: 'BMS', roles: ['ADMIN', 'DISPATCHER'] },
        { system: 'VMMS', roles: ['FLEET_MANAGER', 'TECHNICIAN'] },
        { system: 'VRMS', roles: ['MECHANIC'] },
      ],
    };
    expect(systemRoleTag(user, 'BMS', label)).toBe('Admin');
    expect(systemRoleTag(user, 'VMMS', label)).toBe('VMMS fleet_manager');
  });

  it('shows no tag for a system with no roles, no entry, or an answer without the field', () => {
    expect(systemRoleTag({ systemRoles: [{ system: 'VMMS', roles: [] }] }, 'VMMS', label)).toBe('');
    expect(systemRoleTag({ systemRoles: [{ system: 'BMS', roles: ['ADMIN'] }] }, 'VMMS', label)).toBe('');
    expect(systemRoleTag({}, 'VMMS', label)).toBe('');
    expect(systemRoleTag(null, 'VMMS', label)).toBe('');
  });

  it('never tags from the VRMS token roles, which hold VRMS only', () => {
    const user = { roles: [{ system: 'VMMS' as const, role: 'ADMIN' }], systemRoles: [] };
    expect(systemRoleTag(user, 'VMMS', label)).toBe('');
  });

  it('shows Suite management to a VMMS Admin who holds a non admin VRMS role', () => {
    expect(
      holdsAdminAnywhere({
        roles: [{ system: 'VRMS', role: 'MECHANIC' }],
        systemRoles: [
          { system: 'VMMS', roles: ['ADMIN'] },
          { system: 'VRMS', roles: ['MECHANIC'] },
        ],
        suiteAdmin: false,
      }),
    ).toBe(true);
  });

  it('shows Suite management to a suite admin on a temporary non admin VRMS role', () => {
    const user = {
      role: 'CHIEF_MECHANIC',
      roles: [{ system: 'VRMS' as const, role: 'CHIEF_MECHANIC' }],
      systems: ['VRMS'],
      systemRoles: [{ system: 'VRMS', roles: ['CHIEF_MECHANIC'] }],
      suiteAdmin: true,
    };
    expect(holdsAdminAnywhere(user)).toBe(true);
    // One system, not a VRMS Admin: the grid shows only because of suiteAdmin
    expect(canSwitchSystem(user)).toBe(true);
    expect(canSwitchSystem({ ...user, suiteAdmin: false })).toBe(false);
  });

  it('follows the VRMS ADMIN alone while the answer lacks the new fields', () => {
    expect(holdsAdminAnywhere({ roles: [{ system: 'VRMS', role: 'ADMIN' }] })).toBe(true);
    expect(holdsAdminAnywhere({ roles: [{ system: 'VRMS', role: 'CHIEF_MECHANIC' }] })).toBe(false);
    expect(holdsAdminAnywhere({})).toBe(false);
    expect(holdsAdminAnywhere(null)).toBe(false);
    expect(canSwitchSystem({ systems: ['VRMS'], role: 'MECHANIC' })).toBe(false);
  });
});
