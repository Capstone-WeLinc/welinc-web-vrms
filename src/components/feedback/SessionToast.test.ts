import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionToastBody } from './SessionToast';

// covers: suite spec 0019 AC-25 (VRMS: the session warning toast in place of the banner)
// This project's tests run in plain Node, so the toast is rendered to markup; Stay signed in and
// the spoken line at 30 seconds need a DOM and stay /check verify steps.

const NOW = Date.parse('2026-11-23T10:00:00.000Z');

// The store side (`SessionToast` reads `idleWarning`) needs a DOM; here the body gets it directly
function render(cannotExtend: boolean) {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  return renderToStaticMarkup(
    createElement(SessionToastBody, { warning: { cutoff: NOW + 110_000, cannotExtend, busy: false } }),
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('SessionToast', () => {
  it('asks Still there? with a hidden countdown and Stay signed in, and no close button or time bar', () => {
    const html = render(false);
    expect(html).toContain('Still there?');
    expect(html).toContain('<span aria-hidden="true" class="font-mono font-medium text-foreground">1:50</span>');
    expect(html).toContain('for inactivity.');
    expect(html).toContain('Stay signed in');
    expect(html).not.toContain('aria-label="Close"');
    expect(html).not.toContain('data-slot="toast-bar"');
    // The toast is no live region of its own: it speaks through its one status line
    expect(html).not.toMatch(/data-slot="toast"[^>]*role=/);
    expect(html).toContain('role="status"');
  });

  it('names the end time at the 12 hour limit, with no action', () => {
    const html = render(true);
    const local = new Date(NOW + 110_000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    expect(html).toContain(`Your session ends at ${local}`);
    expect(html).toContain('This is the 12 hour limit. Sign in again to keep working.');
    expect(html).not.toContain('Stay signed in');
  });
});
