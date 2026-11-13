import { describe, it, expect, vi } from 'vitest';

vi.mock('./session', () => ({ PORTAL_URL: 'http://localhost:8000' }));

import { canSwitchSystem, switchSystemUrl } from './switchSystem';

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
