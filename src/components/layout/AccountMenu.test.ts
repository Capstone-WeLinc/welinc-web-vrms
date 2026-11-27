import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { User } from '../../types';

// Static markup reads a zustand store's initial state, so the test holds the user itself.
const state: { user: User | null } = { user: null };
vi.mock('../../store/authStore', () => ({
  useAuthStore: (select: (s: typeof state) => unknown) => select(state),
}));

import { AccountMenu } from './AccountMenu';

// covers: spec 0027 AC-10
describe('the avatar menu button', () => {
  beforeEach(() => {
    state.user = null;
  });

  it('shows initials only and speaks them with a hidden name, with no aria-label', () => {
    state.user = { id: 'u1', name: 'Alberto Santiago', email: 'alberto@welinc.com', role: 'MECHANIC', system: 'VRMS', systems: ['VRMS'], systemRoles: [], suiteAdmin: false };
    const html = renderToStaticMarkup(createElement(AccountMenu));

    expect(html).toContain('>AS<');
    expect(html).toContain('Account menu for Alberto Santiago');
    expect(html).not.toContain('aria-label');
  });

  it('renders nothing signed out', () => {
    expect(renderToStaticMarkup(createElement(AccountMenu))).toBe('');
  });
});
