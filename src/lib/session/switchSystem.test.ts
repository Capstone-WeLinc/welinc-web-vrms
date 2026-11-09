import { describe, it, expect, vi } from 'vitest';

vi.mock('./session', () => ({ PORTAL_URL: 'http://localhost:8000' }));

import { canSwitchSystem, switchSystemUrl } from './switchSystem';

// covers: spec 0007 AC-8, AC-9
describe('Switch system', () => {
  it('shows only with two or more systems, and an older answer counts as none', () => {
    expect(canSwitchSystem(null)).toBe(false);
    expect(canSwitchSystem({ systems: [] })).toBe(false);
    expect(canSwitchSystem({ systems: ['VRMS'] })).toBe(false);
    expect(canSwitchSystem({ systems: ['VMMS', 'VRMS'] })).toBe(true);
    expect(canSwitchSystem({ systems: undefined as unknown as string[] })).toBe(false);
  });

  it('opens the portal launcher with from=VRMS', () => {
    expect(switchSystemUrl()).toBe('http://localhost:8000/?from=VRMS');
    expect(switchSystemUrl('https://portal.test/')).toBe('https://portal.test/?from=VRMS');
  });
});
