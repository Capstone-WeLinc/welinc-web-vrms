import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CrashScreen } from './CrashScreen';

// covers: VRMS spec 0025 AC-7
// This project's tests run in plain Node, so the screen is rendered to markup; clicking Reload
// needs a DOM and stays a /check verify step.

const render = (props: { variant: 'page' | 'full'; code?: string }) =>
  renderToStaticMarkup(createElement(MemoryRouter, null, createElement(CrashScreen, props)));

describe('CrashScreen', () => {
  it('tells the person what to do and offers Reload and a way back', () => {
    const html = render({ variant: 'page' });

    expect(html).toContain('Something went wrong on this page');
    expect(html).toContain('Reload');
    expect(html).toContain('Back to dashboard');
  });

  it('announces itself as an alert', () => {
    expect(render({ variant: 'page' })).toContain('role="alert"');
  });

  it('shows the reference code when there is one', () => {
    const html = render({ variant: 'page', code: 'abcdef01' });

    expect(html).toContain('Reference');
    expect(html).toContain('abcdef01');
  });

  it('shows no reference line when monitoring is off', () => {
    expect(render({ variant: 'page' })).not.toContain('Reference');
  });

  it('keeps the page variant inside the shell, with a link that stays in the app', () => {
    const html = render({ variant: 'page' });

    expect(html).not.toContain('min-h-dvh');
    expect(html).toContain('href="/dashboard"');
  });

  it('fills the window in the full variant, with a plain link that reloads the app', () => {
    const html = render({ variant: 'full' });

    expect(html).toContain('min-h-dvh');
    expect(html).toContain('href="/dashboard"');
  });

  it('hides the decorative icon from screen readers', () => {
    expect(render({ variant: 'page' })).toContain('aria-hidden="true"');
  });
});
