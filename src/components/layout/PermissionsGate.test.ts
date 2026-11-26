import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

// covers: VRMS spec 0028 AC-12, AC-13, AC-14, AC-16 (and spec 0011 AC-23 still)

const permissions = vi.hoisted(() => ({
  value: { status: 'error', keys: [] as string[], error: null as string | null, retry: () => undefined },
}));
vi.mock('../../lib/permissions/usePermissions', () => ({ usePermissions: () => permissions.value }));
vi.mock('../../lib/session/signOutFlow', () => ({ signOutFlow: vi.fn() }));

const { DoorBand, PermissionsGate } = await import('./PermissionsGate');

const render = () => renderToStaticMarkup(createElement(PermissionsGate, null, createElement('p', null, 'the app')));

afterEach(() => vi.restoreAllMocks());

describe('PermissionsGate', () => {
  it('a failed first fetch: the reader or the lanyard band, Try again and Sign out', () => {
    permissions.value = { status: 'error', keys: [], error: null, retry: () => undefined };
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const reader = render();
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const lanyard = render();

    expect(reader).toContain('data-scene="reader"');
    expect(lanyard).toContain('data-scene="lanyard"');
    for (const markup of [reader, lanyard]) {
      expect(markup).toContain('<main id="main"');
      expect(markup).toMatch(/<h1[^>]*>Could not load your permissions<\/h1>/);
      expect(markup).toContain('Check your connection, then try again.');
      expect(markup).toContain('Try again');
      expect(markup).toContain('Sign out');
      expect(markup).not.toContain('the app');
    }
  });

  it('shows the call’s own message when there is one', () => {
    permissions.value = { status: 'error', keys: [], error: 'The VRMS service is unavailable.', retry: () => undefined };
    expect(render()).toContain('The VRMS service is unavailable.');
  });

  it('no VRMS keys: the gate drawn wide, with Sign out', () => {
    permissions.value = { status: 'ready', keys: [], error: null, retry: () => undefined };
    const markup = render();

    expect(markup).toContain('data-scene="gate-wide"');
    expect(markup).toContain('No VRMS access');
    expect(markup).toContain('Ask an admin to give you a VRMS role.');
    expect(markup).toContain('Sign out');
  });

  it('with keys, the app itself', () => {
    permissions.value = { status: 'ready', keys: ['ticket.view'], error: null, retry: () => undefined };
    expect(render()).toBe('<p>the app</p>');
  });

  it('the brand lockup in the band is never a link (the full page crash renders above the router)', () => {
    permissions.value = { status: 'ready', keys: [], error: null, retry: () => undefined };
    expect(render()).not.toContain('<a ');
  });
});

describe('DoorBand', () => {
  it('draws the scene the caller picked, so a retry never swaps it', () => {
    const band = (pick: number) =>
      renderToStaticMarkup(createElement(DoorBand, { pick, title: "Can't reach the sign in service", line: 'Check your connection, then try again.', actions: null }));

    expect(band(0)).toContain('data-scene="reader"');
    expect(band(1)).toContain('data-scene="lanyard"');
    expect(band(0)).not.toContain('Sign out');
  });
});
