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

  it('tags a card Admin when you hold ADMIN there, else your first role there by its name', () => {
    const user = {
      roles: [
        { system: 'VRMS' as const, role: 'MECHANIC' },
        { system: 'BMS' as const, role: 'DISPATCHER' },
        { system: 'BMS' as const, role: 'ADMIN' },
        { system: 'VMMS' as const, role: 'FLEET_MANAGER' },
        { system: 'VMMS' as const, role: 'TECHNICIAN' },
      ],
    };
    expect(systemRoleTag(user, 'BMS', label)).toBe('Admin');
    expect(systemRoleTag(user, 'VMMS', label)).toBe('VMMS fleet_manager');
    expect(systemRoleTag({ roles: [] }, 'VMMS', label)).toBe('');
  });

  it('shows Suite management to anyone holding ADMIN in any system', () => {
    expect(holdsAdminAnywhere({ roles: [{ system: 'BMS', role: 'ADMIN' }] })).toBe(true);
    expect(holdsAdminAnywhere({ roles: [{ system: 'VRMS', role: 'CHIEF_MECHANIC' }] })).toBe(false);
    expect(holdsAdminAnywhere(null)).toBe(false);
  });
});
