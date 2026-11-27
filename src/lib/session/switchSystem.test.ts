import { describe, it, expect, vi } from 'vitest';

vi.mock('./session', () => ({ PORTAL_URL: 'http://localhost:8000' }));

import { canSwitchSystem, openSystemUrl, switchSystemUrl, switcherSystems } from './switchSystem';

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

// covers: spec 0027 AC-9
describe('the system switcher menu', () => {
  it('opens another system straight through the launcher', () => {
    expect(openSystemUrl('VMMS')).toBe('http://localhost:8000/?from=VRMS&open=VMMS');
    expect(openSystemUrl('BMS', 'https://portal.test/')).toBe('https://portal.test/?from=VRMS&open=BMS');
  });

  it('lists the systems in VRMS, VMMS, BMS order, VRMS always first', () => {
    expect(switcherSystems({ systems: ['BMS', 'VRMS', 'VMMS'] })).toEqual(['VRMS', 'VMMS', 'BMS']);
    expect(switcherSystems({ systems: ['VMMS'] })).toEqual(['VRMS', 'VMMS']);
    expect(switcherSystems({ systems: ['VRMS', 'XYZ'] })).toEqual(['VRMS']);
    expect(switcherSystems(null)).toEqual(['VRMS']);
  });
});
