import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { PermissionKey } from '../../lib/permissions/keys';
import { SidebarNav } from './SidebarNav';
import { getNavSections, withCounts } from './navItems';

const CHIEF: PermissionKey[] = ['ticket.view', 'ticket.view_all', 'ticket.verify', 'knowledge.view', 'knowledge.edit'];
const sections = withCounts(
  getNavSections((key) => CHIEF.includes(key), { inRoster: true }),
  { open: 12, signoff: 3, mine: 0, suggestions: 140 },
);

const render = (url: string) =>
  renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [url] }, createElement(SidebarNav, { sections })));

// covers: spec 0027 AC-3, AC-5, AC-6, AC-14
describe('SidebarNav', () => {
  it('opens the group of the current sub page and marks only that sub page current', () => {
    const html = render('/repairs?view=signoff');

    expect(html).toContain('aria-expanded="true"');
    expect(html).toMatch(/aria-current="page"[^>]*>(<[^>]+>)*Waiting for sign off/);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it('shows gold only on hot counts, no bubble for 0, 99+ above 99, and a spoken name', () => {
    const html = render('/repairs?view=open');

    expect(html).toContain('3 waiting for sign off');
    expect(html).not.toContain('0 assigned to you');
    expect(html).toMatch(/bg-highlight[^>]*>3</);
    expect(html).toMatch(/bg-sidebar-count[^>]*>12</);
  });

  it('labels the sections and leaves the first one unlabelled', () => {
    const html = render('/dashboard');

    expect(html).toContain('>Work</h2>');
    expect(html).toContain('>Insights</h2>');
    expect(html.match(/<h2/g)).toHaveLength(2);
  });

  it('shows the hot total on a closed parent', () => {
    // Knowledge base is closed on the dashboard: its 140 suggestions read 99+ on the parent.
    expect(render('/dashboard')).toMatch(/bg-highlight[^>]*>99\+</);
  });
});
