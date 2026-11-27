import { describe, expect, it } from 'vitest';
import type { PermissionKey } from '../../lib/permissions/keys';
import {
  countName,
  countText,
  getMobileTabs,
  getNavMatch,
  getNavSections,
  hotTotal,
  usesTabBar,
  withCounts,
  type NavItem,
} from './navItems';

// The default matrix of spec 0011 (backend catalog.ts)
const ADMIN: PermissionKey[] = [
  'ticket.view',
  'ticket.view_all',
  'ticket.create',
  'ticket.administer',
  'ticket.costs.view',
  'ticket.costs.edit',
  'ticket.unlock',
  'audit.view',
  'analytics.view',
  'config.read',
  'knowledge.view',
  'knowledge.suggest',
  'knowledge.edit',
  'team.manage',
  'settings.manage',
  'lookups.manage',
  'ai.use',
];
const CHIEF: PermissionKey[] = ['ticket.view', 'ticket.view_all', 'ticket.work', 'ticket.verify', 'config.read', 'knowledge.view', 'knowledge.suggest', 'knowledge.edit'];
const MECHANIC: PermissionKey[] = ['ticket.view', 'ticket.work', 'config.read', 'knowledge.view', 'knowledge.suggest'];

const holding = (keys: PermissionKey[]) => (key: PermissionKey) => keys.includes(key);
const nav = (keys: PermissionKey[], inRoster = false) => getNavSections(holding(keys), { inRoster });
const paths = (keys: PermissionKey[]) => nav(keys).flatMap((section) => section.items.map((item) => item.to));
const kids = (keys: PermissionKey[], parent: string, inRoster = false) =>
  nav(keys, inRoster)
    .flatMap((section) => section.items)
    .find((item) => item.to === parent)
    ?.children?.map((child) => child.label);

// covers: spec 0027 AC-1, AC-2
describe('getNavSections', () => {
  it('gives an admin the unlabelled first section, then Work, Insights and Admin; no Profile, no New repair', () => {
    const sections = nav(ADMIN);

    expect(sections.map((s) => s.title)).toEqual(['', 'Work', 'Insights', 'Admin']);
    expect(paths(ADMIN)).toEqual(['/dashboard', '/repairs', '/history', '/analytics', '/knowledge-base', '/users', '/audit-logs', '/settings']);
  });

  it('shows Settings to anyone holding one of its section keys (spec 0012, AC-21)', () => {
    expect(paths(CHIEF)).not.toContain('/settings');
    expect(paths([...CHIEF, 'lookups.manage'])).toContain('/settings');
    expect(paths([...CHIEF, 'vehicle.manage'])).toContain('/settings');
  });

  it('gives a mechanic My dashboard, My repairs with its three sub pages, and the knowledge base', () => {
    const sections = nav(MECHANIC);

    expect(sections.map((s) => s.title)).toEqual(['', 'Work', 'Insights']);
    expect(sections[0].items[0].label).toBe('My dashboard');
    expect(sections[1].items.map((i) => i.label)).toEqual(['My repairs', 'Repair history']);
    expect(kids(MECHANIC, '/repairs')).toEqual(['In progress', 'Sent back to me', 'Done']);
  });

  it('gives ticket.view_all All open and Waiting for sign off, plus Assigned to me only in the roster', () => {
    expect(kids(ADMIN, '/repairs')).toEqual(['All open', 'Waiting for sign off']);
    expect(kids(CHIEF, '/repairs', true)).toEqual(['All open', 'Waiting for sign off', 'Assigned to me']);
  });

  it('links each sub page to its view preset', () => {
    const repairs = nav(MECHANIC)[1].items[0];

    expect(repairs.children?.map((c) => c.to)).toEqual(['/repairs?view=active', '/repairs?view=sentBack', '/repairs?view=done']);
  });

  it('marks the hot counts from the keys (AC-6)', () => {
    const hot = (keys: PermissionKey[]) =>
      nav(keys, true)
        .flatMap((s) => s.items)
        .flatMap((i) => i.children ?? [])
        .filter((c) => c.hot)
        .map((c) => c.countKey);

    expect(hot(CHIEF)).toEqual(['signoff', 'suggestions']);
    expect(hot(ADMIN)).toEqual(['suggestions']);
    expect(hot(MECHANIC)).toEqual(['sentBack']);
  });

  it('opens Knowledge base into Guides and Suggestions with knowledge.edit, a plain link without', () => {
    expect(kids(CHIEF, '/knowledge-base')).toEqual(['Guides', 'Suggestions']);
    expect(kids(MECHANIC, '/knowledge-base')).toBeUndefined();
  });

  it('follows the keys, not the role: an admin without audit.view loses Audit logs', () => {
    expect(paths(ADMIN.filter((key) => key !== 'audit.view'))).not.toContain('/audit-logs');
  });

  it('shows Analytics only with analytics.view (spec 0011, AC-22a)', () => {
    expect(paths(ADMIN.filter((key) => key !== 'analytics.view'))).not.toContain('/analytics');
    expect(nav([...CHIEF, 'analytics.view'])[2]).toMatchObject({ title: 'Insights', items: [{ to: '/analytics' }, { to: '/knowledge-base' }] });
  });

  it('drops a section with no item left', () => {
    expect(nav(['ticket.view']).map((s) => s.title)).toEqual(['', 'Work']);
  });
});

// covers: spec 0027 AC-11
describe('the phone tab bar', () => {
  it('holds the top level pages only, with no Account tab', () => {
    const tabs = getMobileTabs(nav(MECHANIC));

    expect(tabs.map((t) => t.to)).toEqual(['/dashboard', '/repairs', '/history', '/knowledge-base']);
    expect(tabs.some((t) => t.to === '/profile')).toBe(false);
  });

  it('is used when the top level pages fit in 5, else the sheet', () => {
    expect(usesTabBar(nav(MECHANIC))).toBe(true);
    expect(usesTabBar(nav(CHIEF))).toBe(true);
    // Five pages: someone who also sees Analytics keeps the tab bar
    expect(usesTabBar(nav([...MECHANIC, 'analytics.view']))).toBe(true);
    expect(usesTabBar(nav([...CHIEF, 'analytics.view']))).toBe(true);
    // Any Admin page makes it six or more
    expect(usesTabBar(nav(ADMIN))).toBe(false);
    expect(usesTabBar(nav([...CHIEF, 'analytics.view', 'audit.view']))).toBe(false);
  });
});

// covers: spec 0027 AC-3
describe('getNavMatch', () => {
  const sections = nav(CHIEF, true);

  it('makes the sub page current, matching its view', () => {
    const match = getNavMatch('/repairs', '?view=signoff&garage=x', sections);

    expect(match?.item.to).toBe('/repairs');
    expect(match?.child?.label).toBe('Waiting for sign off');
  });

  it('makes Repair tickets itself current on a ticket, the plain list or the referrals tab', () => {
    expect(getNavMatch('/repairs/0b0', '', sections)?.child).toBeUndefined();
    expect(getNavMatch('/repairs', '', sections)?.child).toBeUndefined();
    expect(getNavMatch('/repairs', '?view=referrals', sections)?.child).toBeUndefined();
    expect(getNavMatch('/repairs/new', '', sections)?.item.to).toBe('/repairs');
  });

  it('picks Suggestions over Guides, and Guides for an entry', () => {
    expect(getNavMatch('/knowledge-base/suggestions', '', sections)?.child?.label).toBe('Suggestions');
    expect(getNavMatch('/knowledge-base/42', '', sections)?.child?.label).toBe('Guides');
  });

  it('reads / as the dashboard', () => {
    expect(getNavMatch('/', '', sections)?.item.to).toBe('/dashboard');
  });
});

// covers: spec 0027 AC-5, AC-14
describe('counts', () => {
  it('fills each sub page from the counts and sums the hot ones for a closed parent', () => {
    const filled = withCounts(nav(CHIEF, true), { open: 12, signoff: 3, mine: 2, suggestions: 1 });
    const repairs = filled[1].items[0] as NavItem;

    expect(repairs.children?.map((c) => c.count)).toEqual([12, 3, 2]);
    expect(hotTotal(repairs)).toBe(3);
  });

  it('caps the bubble at 99+ and names it for screen readers', () => {
    expect(countText(7)).toBe('7');
    expect(countText(100)).toBe('99+');
    expect(countName('signoff', 3)).toBe('3 waiting for sign off');
  });
});
