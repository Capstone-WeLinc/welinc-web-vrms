import { describe, expect, it } from 'vitest';
import type { PermissionKey } from '../../lib/permissions/keys';
import { getMobileTabs, getNavSections, usesTabBar } from './navItems';

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
  'users.manage',
  'team.manage',
  'permissions.manage',
  'settings.manage',
  'lookups.manage',
  'ai.use',
];
const CHIEF: PermissionKey[] = ['ticket.view', 'ticket.view_all', 'ticket.work', 'config.read', 'knowledge.view', 'knowledge.suggest', 'knowledge.edit'];
const MECHANIC: PermissionKey[] = ['ticket.view', 'ticket.work', 'config.read', 'knowledge.view', 'knowledge.suggest'];

const holding = (keys: PermissionKey[]) => (key: PermissionKey) => keys.includes(key);
const paths = (keys: PermissionKey[]) =>
  getNavSections(holding(keys)).flatMap((section) => section.items.map((item) => item.to));

describe('getNavSections', () => {
  it('gives an admin every page', () => {
    expect(paths(ADMIN)).toEqual([
      '/dashboard',
      '/profile',
      '/repairs',
      '/repairs/new',
      '/history',
      '/analytics',
      '/knowledge-base',
      '/users',
      '/audit-logs',
      '/settings',
    ]);
  });

  it('shows Settings to anyone holding one of its three keys (spec 0012, AC-21)', () => {
    expect(paths(CHIEF)).not.toContain('/settings');
    expect(paths([...CHIEF, 'lookups.manage'])).toContain('/settings');
    expect(paths([...CHIEF, 'permissions.manage'])).toContain('/settings');
  });

  it('gives a mechanic their own repairs and the knowledge base, nothing to administer', () => {
    const sections = getNavSections(holding(MECHANIC));

    expect(sections.map((s) => s.title)).toEqual(['General', 'Vehicle repairs', 'Knowledge base']);
    expect(sections[1].items.map((i) => i.label)).toEqual(['My repairs', 'Repair history']);
  });

  it('labels the list for every ticket when the chief holds ticket.view_all, with no New repair', () => {
    const repairs = getNavSections(holding(CHIEF))[1];

    expect(repairs.items.map((i) => i.label)).toEqual(['Repair tickets', 'Repair history']);
  });

  it('follows the keys, not the role: an admin without audit.view loses Audit logs', () => {
    expect(paths(ADMIN.filter((key) => key !== 'audit.view'))).not.toContain('/audit-logs');
  });

  it('shows Analytics, and names its group for it, only with analytics.view (spec 0011, AC-22a)', () => {
    expect(paths(ADMIN.filter((key) => key !== 'analytics.view'))).not.toContain('/analytics');
    expect(getNavSections(holding([...CHIEF, 'analytics.view']))[2]).toMatchObject({
      title: 'Analytics & AI',
      items: [{ to: '/analytics' }, { to: '/knowledge-base' }],
    });
    expect(getNavSections(holding(CHIEF))[2].title).toBe('Knowledge base');
  });

  it('drops a section with no item left', () => {
    const titles = getNavSections(holding(['ticket.view'])).map((s) => s.title);

    expect(titles).toEqual(['General', 'Vehicle repairs']);
  });

  it('builds the phone tabs from the same sections', () => {
    const tabs = getMobileTabs(getNavSections(holding(MECHANIC)));

    expect(tabs.map((t) => t.to)).toEqual(['/dashboard', '/repairs', '/history', '/knowledge-base', '/profile']);
  });
});

describe('usesTabBar', () => {
  it('gives the tab bar to a nav that fits it, and the sheet menu otherwise', () => {
    expect(usesTabBar(getNavSections(holding(MECHANIC)))).toBe(true);
    expect(usesTabBar(getNavSections(holding(CHIEF)))).toBe(true);
    expect(usesTabBar(getNavSections(holding(ADMIN)))).toBe(false);
  });

  it('switches to the sheet when a granted page has no tab, so it is never out of reach', () => {
    expect(usesTabBar(getNavSections(holding([...CHIEF, 'analytics.view'])))).toBe(false);
  });
});
