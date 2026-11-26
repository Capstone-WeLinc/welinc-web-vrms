import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClosedScene } from './scenes/ClosedScene';
import { CrashScene } from './scenes/CrashScene';
import { ErrorTile } from './scenes/ErrorTile';
import { GateScene } from './scenes/GateScene';
import { LanyardScene } from './scenes/LanyardScene';
import { LoadScene } from './scenes/LoadScene';
import { NotFoundBayScene } from './scenes/NotFoundBayScene';
import { NotFoundDrawerScene } from './scenes/NotFoundDrawerScene';
import { PoleScene } from './scenes/PoleScene';
import { ReaderScene } from './scenes/ReaderScene';
import { RoadScene } from './scenes/RoadScene';
import { TILE_SUBJECTS } from './scenes/tileSubjects';
import { useScenePick } from './scenes/useScenePick';
import { ErrorState } from '../shared/ErrorState';
import { RecordNotFound } from '../shared/RecordNotFound';
import { ForbiddenPage } from '../../pages/ForbiddenPage';
import { ModuleOffPage } from '../../pages/ModuleOffPage';
import { NotFoundPage } from '../../pages/NotFoundPage';

// covers: VRMS spec 0028 AC-3, AC-4, AC-7, AC-8, AC-9, AC-10, AC-11, AC-15, AC-16, AC-18
// Plain Node: screens render to markup. Motion, the still frames and narrow widths are /check verify.

const html = (el: ReactElement) => renderToStaticMarkup(createElement(MemoryRouter, null, el));
const alertOf = (markup: string) => /role="alert"[^>]*>([\s\S]*?)<\/div>/.exec(markup)?.[1] ?? '';

afterEach(() => vi.restoreAllMocks());

describe('scenes', () => {
  const scenes: [string, () => ReactElement][] = [
    ['crash', () => createElement(CrashScene)],
    ['load', () => createElement(LoadScene)],
    ['not-found-bay', () => createElement(NotFoundBayScene)],
    ['not-found-drawer', () => createElement(NotFoundDrawerScene)],
    ['closed', () => createElement(ClosedScene)],
    ['gate', () => createElement(GateScene)],
    ['gate-wide', () => createElement(GateScene, { wide: true })],
    ['pole', () => createElement(PoleScene)],
    ['reader', () => createElement(ReaderScene)],
    ['lanyard', () => createElement(LanyardScene)],
    ['road', () => createElement(RoadScene)],
  ];

  it.each(scenes)('%s is decoration: hidden, never focusable, named', (name, make) => {
    const markup = html(make());
    expect(markup).toMatch(new RegExp(`^<svg aria-hidden="true" focusable="false" data-scene="${name}"`));
  });

  it('draws panels at 720 by 220 and bands at 1440 by 260, bands cropping from both sides', () => {
    expect(html(createElement(LoadScene))).toContain('viewBox="0 0 720 220"');
    expect(html(createElement(GateScene))).toContain('viewBox="0 0 720 220"');
    const band = html(createElement(GateScene, { wide: true }));
    expect(band).toContain('viewBox="0 0 1440 260"');
    expect(band).toContain('preserveAspectRatio="xMidYMax slice"');
  });

  it('draws the wide gate centred, its fence carried to the full width', () => {
    const band = html(createElement(GateScene, { wide: true }));
    expect(band).toContain('transform="translate(360 40)"');
    expect(band).toContain('x2="1440"');
  });

  it('gives each copy of a scene its own gradient ids', () => {
    const markup = html(createElement('div', null, createElement(CrashScene), createElement(CrashScene)));
    const ids = [...markup.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(1);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('tiles', () => {
  it.each(TILE_SUBJECTS)('%s is a hidden 120 by 88 drawing', (subject) => {
    const markup = html(createElement(ErrorTile, { subject }));
    expect(markup).toMatch(new RegExp(`^<svg aria-hidden="true" focusable="false" data-scene="tile-${subject}" viewBox="0 0 120 88"`));
  });

  it('has the 12 subjects of the spec', () => {
    expect([...TILE_SUBJECTS].sort()).toEqual(
      ['activity', 'charts', 'devices', 'history', 'knowledge', 'list', 'parts', 'people', 'roles', 'settings', 'tickets', 'trucks'],
    );
  });
});

describe('ErrorState', () => {
  it('page: the idling truck panel, the reassurance, the alert on the title and line only', () => {
    const markup = html(createElement(ErrorState, { kind: 'page', title: 'We couldn’t load repair tickets', message: 'Network Error', onRetry: () => undefined }));

    expect(markup).toContain('data-scene="load"');
    expect(markup).toContain('Nothing you saved is lost.');
    expect(alertOf(markup)).toContain('We couldn’t load repair tickets');
    expect(alertOf(markup)).toContain('Network Error');
    expect(alertOf(markup)).not.toContain('Try again');
    expect(markup).toMatch(/<h2[^>]*>We couldn’t load repair tickets<\/h2>/);
  });

  it('page: no reassurance where unsaved drafts can exist', () => {
    const markup = html(createElement(ErrorState, { kind: 'page', reassure: false, message: 'x' }));
    expect(markup).not.toContain('Nothing you saved is lost.');
  });

  it('page: keeps the call site’s retry label', () => {
    expect(html(createElement(ErrorState, { kind: 'page', message: 'x', onRetry: () => undefined, retryText: 'Retry' }))).toContain('>Retry<');
  });

  it('tile: the subject’s drawing, a quiet status, no navy scene and no reassurance', () => {
    const markup = html(createElement(ErrorState, { kind: 'tile', subject: 'devices', title: 'We couldn’t load your devices', message: 'x' }));

    expect(markup).toContain('data-scene="tile-devices"');
    expect(markup).not.toContain('data-scene="load"');
    expect(markup).not.toContain('Nothing you saved is lost.');
    expect(markup).not.toContain('role="alert"');
    expect(markup).toContain('role="status"');
  });
});

describe('useScenePick', () => {
  function Probe({ random }: { random: () => number }) {
    return createElement('span', null, String(useScenePick(2, random)));
  }

  it('maps the random draw to one of the scenes', () => {
    expect(renderToStaticMarkup(createElement(Probe, { random: () => 0 }))).toBe('<span>0</span>');
    expect(renderToStaticMarkup(createElement(Probe, { random: () => 0.49 }))).toBe('<span>0</span>');
    expect(renderToStaticMarkup(createElement(Probe, { random: () => 0.5 }))).toBe('<span>1</span>');
    expect(renderToStaticMarkup(createElement(Probe, { random: () => 0.999 }))).toBe('<span>1</span>');
  });

  it('draws once per mount, so a later render keeps the picture', () => {
    const random = vi.fn(() => 0.7);
    renderToStaticMarkup(createElement(Probe, { random }));
    expect(random).toHaveBeenCalledTimes(1);
  });
});

describe('screens', () => {
  it('ticket not found: the bay or the drawer, with the board’s copy', () => {
    const props = { scenes: 'pair' as const, title: 'Repair ticket not found', line: 'It may have been deleted, or the link has a typo. Check the ticket number and try again.', action: 'Back to repairs' };
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    expect(html(createElement(RecordNotFound, props))).toContain('data-scene="not-found-bay"');
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const markup = html(createElement(RecordNotFound, props));
    expect(markup).toContain('data-scene="not-found-drawer"');
    expect(markup).toContain('Check the ticket number and try again.');
  });

  it('knowledge entry not found: the drawer only', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    expect(html(createElement(RecordNotFound, { scenes: 'drawer', title: 'This entry isn’t available.', action: null }))).toContain('data-scene="not-found-drawer"');
  });

  it('forbidden: the gate, with copy that names no role', () => {
    const markup = html(createElement(ForbiddenPage));
    expect(markup).toContain('data-scene="gate"');
    expect(markup).toContain('This page needs a different role');
    expect(markup).toContain('Ask an admin to give you access if you need it for your work.');
    expect(markup).toContain('Back to dashboard');
  });

  it('module off: the closed shutter', () => {
    const markup = html(createElement(ModuleOffPage, { module: 'analytics' }));
    expect(markup).toContain('data-scene="closed"');
    expect(markup).toContain('is turned off');
  });

  it('not found: the road band with the portal’s copy', () => {
    const markup = html(createElement(NotFoundPage));
    expect(markup).toContain('data-scene="road"');
    expect(markup).toContain('<main id="main"');
    expect(markup).toContain('Error 404');
    expect(markup).toMatch(/<h1[^>]*>Wrong turn<\/h1>/);
    expect(markup).toContain('href="/dashboard"');
  });
});
