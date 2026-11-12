import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/session/session', () => ({ PORTAL_URL: 'https://portal.example.com/' }));

import { addUserUrl, manageAccountUrl } from './portalLinks';

// Suite spec 0013, AC-31
describe('portal links', () => {
  it('opens one person in the portal, scoped to VRMS', () => {
    expect(manageAccountUrl('00000000-0000-4000-8000-000000001101')).toBe(
      'https://portal.example.com/admin/people/00000000-0000-4000-8000-000000001101?system=VRMS',
    );
  });

  it('opens Add person with VRMS picked', () => {
    expect(addUserUrl()).toBe('https://portal.example.com/admin/people/new?system=VRMS');
  });
});
