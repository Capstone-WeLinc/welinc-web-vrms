import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { setCrashViewerIsAdmin } from '../../lib/monitoring/standing';
import { CrashScreen } from './CrashScreen';

// covers: VRMS spec 0025 AC-7, AC-7a; VRMS spec 0028 AC-4, AC-5, AC-6, AC-18
// This project's tests run in plain Node, so the screen is rendered to markup; clicking Reload and
// Copy details needs a DOM and stays a /check verify step (the copy outcomes are in copyText.test.ts).

const crash = {
  error: new TypeError('x is undefined'),
  path: '/repairs/42',
  at: new Date('2026-11-25T06:03:07.000Z'),
};

const render = (props: { variant: 'page' | 'full'; code?: string }) =>
  renderToStaticMarkup(createElement(MemoryRouter, null, createElement(CrashScreen, { crash, ...props })));

/** What sits inside the alert: the title and the line, nothing else (spec 0028, AC-5). */
const alertOf = (html: string) => /role="alert"[^>]*>([\s\S]*?)<\/div>/.exec(html)?.[1] ?? '';

/** The markup with tags removed, so text split across elements reads as one string. */
const text = (html: string) => html.replace(/<[^>]+>/g, '');

afterEach(() => setCrashViewerIsAdmin(false));

describe('CrashScreen, staff with a code', () => {
  it('asks the person to send the code, and shows it', () => {
    const html = render({ variant: 'page', code: 'abcdef01' });

    expect(html).toContain('Something went wrong on this page');
    expect(html).toContain('Try reloading. If it keeps happening, send this code to your admin.');
    expect(text(html)).toContain('Reference abcdef01');
  });

  it('shows no details box and no Copy details', () => {
    const html = render({ variant: 'page', code: 'abcdef01' });

    expect(html).not.toContain('Crash details');
    expect(html).not.toContain('Copy details');
    expect(html).not.toContain('x is undefined');
  });
});

describe('CrashScreen, staff without a code', () => {
  it('never asks for a code it does not show', () => {
    const html = render({ variant: 'page' });

    expect(html).toContain('Try reloading. If it keeps happening, tell your admin what you were doing.');
    expect(html).not.toContain('send this code');
    expect(html).not.toContain('Reference');
  });
});

describe('CrashScreen, admin', () => {
  it('asks for a bug report and shows the details box', () => {
    setCrashViewerIsAdmin(true);
    const html = render({ variant: 'page' });

    expect(html).toContain('Try reloading. Copy the details below into your bug report.');
    expect(html).toContain('aria-label="Crash details"');
    expect(html).toContain('TypeError: x is undefined');
    expect(html).toContain('Page: /repairs/42');
    expect(html).toContain('(2026-11-25T06:03:07.000Z)');
    expect(html).toContain('App: web-vrms ');
    expect(html).toContain('Copy details');
  });

  it('adds the Code line once the code arrives, with the time unchanged', () => {
    setCrashViewerIsAdmin(true);
    const before = render({ variant: 'page' });
    const after = render({ variant: 'page', code: 'abcdef01' });

    expect(before).not.toContain('Code:');
    expect(after).toContain('Code: abcdef01');
    const time = (html: string) => /Time: [^\n<]+/.exec(html)?.[0];
    expect(time(after)).toBe(time(before));
  });

  it('shows the code only in the box, not as a Reference line', () => {
    setCrashViewerIsAdmin(true);

    expect(render({ variant: 'page', code: 'abcdef01' })).not.toContain('Reference');
  });

  it('keeps the details box outside the alert, so only the title and line are announced', () => {
    setCrashViewerIsAdmin(true);
    const html = render({ variant: 'page' });
    const alert = alertOf(html);

    expect(alert).toContain('Something went wrong on this page');
    expect(alert).not.toContain('Crash details');
    expect(alert).not.toContain('x is undefined');
  });

  it('never shows a stack trace', () => {
    setCrashViewerIsAdmin(true);

    expect(render({ variant: 'page' })).not.toMatch(/\bat \w+ \(/);
  });
});

describe('CrashScreen, both versions', () => {
  it('offers Reload and a way back, and announces itself as an alert', () => {
    const html = render({ variant: 'page' });

    expect(html).toContain('Reload');
    expect(html).toContain('Back to dashboard');
    expect(html).toContain('role="alert"');
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

  it('hides the scene from screen readers', () => {
    expect(render({ variant: 'page' })).toMatch(/<svg aria-hidden="true" focusable="false" data-scene="crash"/);
  });
});

describe('CrashScreen, spec 0028 scenes', () => {
  it('draws the hazard glow in the page version and the blackout pole in the full one', () => {
    expect(render({ variant: 'page' })).toContain('data-scene="crash"');
    expect(render({ variant: 'page' })).not.toContain('data-scene="pole"');
    expect(render({ variant: 'full' })).toContain('data-scene="pole"');
  });

  it('keeps the staff reference code on screen but outside the alert', () => {
    const html = render({ variant: 'page', code: 'abcdef01' });

    expect(alertOf(html)).toContain('Something went wrong on this page');
    expect(alertOf(html)).toContain('send this code to your admin');
    expect(alertOf(html)).not.toContain('abcdef01');
    expect(text(html)).toContain('Reference abcdef01');
  });

  it('keeps the buttons outside the alert', () => {
    expect(alertOf(render({ variant: 'page' }))).not.toContain('Reload');
  });

  it('renders the full version with no router around it, its title the page heading', () => {
    const html = renderToStaticMarkup(createElement(CrashScreen, { crash, variant: 'full' }));

    expect(html).toContain('<main id="main"');
    expect(html).toMatch(/<h1[^>]*>Something went wrong on this page<\/h1>/);
    expect(html).toContain('href="/dashboard"');
  });

  it('titles the page version with an h2, since the page keeps its own h1', () => {
    expect(render({ variant: 'page' })).toMatch(/<h2[^>]*>Something went wrong on this page<\/h2>/);
  });
});
