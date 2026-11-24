import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { setCrashViewerIsAdmin } from '../../lib/monitoring/standing';
import { CrashScreen } from './CrashScreen';

// covers: VRMS spec 0025 AC-7, AC-7a
// This project's tests run in plain Node, so the screen is rendered to markup; clicking Reload and
// Copy details needs a DOM and stays a /check verify step (the copy outcomes are in copyText.test.ts).

const crash = {
  error: new TypeError('x is undefined'),
  path: '/repairs/42',
  at: new Date('2026-11-25T06:03:07.000Z'),
};

const render = (props: { variant: 'page' | 'full'; code?: string }) =>
  renderToStaticMarkup(createElement(MemoryRouter, null, createElement(CrashScreen, { crash, ...props })));

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
    const alert = /<div[^>]*role="alert"[^>]*>([\s\S]*?)<\/div><div[^>]*data-slot="empty-content"/.exec(html)?.[1] ?? '';

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

  it('hides the decorative icon from screen readers', () => {
    expect(render({ variant: 'page' })).toContain('aria-hidden="true"');
  });
});
