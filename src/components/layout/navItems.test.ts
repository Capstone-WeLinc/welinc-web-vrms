import { describe, expect, it } from 'vitest';
import type { PermissionKey } from '../../lib/permissions/keys';
import { getActiveNavTrail, getMobileTabs, getNavSections, getPhoneMenuItems, usesTabBar } from './navItems';

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

// Spec 0022: the Mechanics item and the phone nav around it
describe('Mechanics in the nav (spec 0022)', () => {
  const tabsOf = (keys: PermissionKey[]) => getMobileTabs(getNavSections(holding(keys))).map((t) => t.to);
  const menuOf = (keys: PermissionKey[]) => getPhoneMenuItems(getNavSections(holding(keys))).map((t) => t.to);
  const tabBar = (keys: PermissionKey[]) => usesTabBar(getNavSections(holding(keys)));
  const CHIEF_M: PermissionKey[] = [...CHIEF, 'mechanics.view'];

  it('shows Mechanics after Repair history with mechanics.view and without users.manage (AC-5)', () => {
    expect(getNavSections(holding(CHIEF_M))[1].items.map((i) => i.label)).toEqual(['Repair tickets', 'Repair history', 'Mechanics']);
    expect(paths(CHIEF)).not.toContain('/mechanics');
    expect(paths([...ADMIN, 'mechanics.view'])).not.toContain('/mechanics');
  });

  it('gives the Chief five tabs and moves Knowledge base to the user menu (AC-11)', () => {
    expect(tabsOf(CHIEF_M)).toEqual(['/dashboard', '/repairs', '/history', '/mechanics', '/profile']);
    expect(tabBar(CHIEF_M)).toBe(true);
    expect(menuOf(CHIEF_M)).toEqual(['/knowledge-base']);
  });

  it('changes nothing for a Chief without knowledge.view', () => {
    const keys = CHIEF_M.filter((k) => !k.startsWith('knowledge.'));
    expect(tabsOf(keys)).toEqual(['/dashboard', '/repairs', '/history', '/mechanics', '/profile']);
    expect(tabBar(keys)).toBe(true);
    expect(menuOf(keys)).toEqual([]);
  });

  it('keeps the sheet menu, with Knowledge base in it, when more pages than the tabs and menu can carry', () => {
    expect(tabBar([...CHIEF_M, 'analytics.view'])).toBe(false);
    expect(menuOf([...CHIEF_M, 'analytics.view'])).toEqual([]);
    // The default matrix also gives the Chief lookups.manage, so Settings: still the sheet
    expect(tabBar([...CHIEF_M, 'lookups.manage'])).toBe(false);
    expect(paths([...CHIEF_M, 'lookups.manage'])).toContain('/knowledge-base');
  });

  it('reads keys, not roles: a Mechanic granted mechanics.view gets the same tabs', () => {
    const keys: PermissionKey[] = [...MECHANIC, 'mechanics.view'];
    expect(tabsOf(keys)).toEqual(['/dashboard', '/repairs', '/history', '/mechanics', '/profile']);
    expect(menuOf(keys)).toEqual(['/knowledge-base']);
  });

  it('leaves the Mechanic tabs and the Admin sheet as they were', () => {
    expect(tabsOf(MECHANIC)).toEqual(['/dashboard', '/repairs', '/history', '/knowledge-base', '/profile']);
    expect(menuOf(MECHANIC)).toEqual([]);
    expect(tabBar(ADMIN)).toBe(false);
    expect(menuOf(ADMIN)).toEqual([]);
  });

  it('names /mechanics in the breadcrumb even when the item is hidden (Admin by URL)', () => {
    const trail = getActiveNavTrail('/mechanics', getNavSections(holding(ADMIN)));
    expect(trail).toMatchObject({ section: { title: 'Vehicle repairs' }, item: { label: 'Mechanics' } });
    expect(getActiveNavTrail('/mechanics', getNavSections(holding(CHIEF_M)))?.item.label).toBe('Mechanics');
    expect(getActiveNavTrail('/nowhere', getNavSections(holding(ADMIN)))).toBeUndefined();
  });
});
