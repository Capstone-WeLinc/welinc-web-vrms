import { describe, expect, it } from 'vitest';
import type { PermissionKey } from '../../lib/permissions/keys';
import { getMobileTabs, getNavSections } from './navItems';

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
  'config.read',
  'knowledge.view',
  'knowledge.suggest',
  'knowledge.edit',
  'users.manage',
  'permissions.manage',
];
const CHIEF: PermissionKey[] = ['ticket.view', 'ticket.view_all', 'ticket.work', 'config.read', 'knowledge.view', 'knowledge.suggest', 'knowledge.edit'];
const MECHANIC: PermissionKey[] = ['ticket.view', 'ticket.work', 'config.read', 'knowledge.view', 'knowledge.suggest'];

const holding = (keys: PermissionKey[]) => (key: PermissionKey) => keys.includes(key);
const paths = (keys: PermissionKey[], role?: 'ADMIN' | 'MECHANIC' | 'CHIEF_MECHANIC') =>
  getNavSections(holding(keys), role).flatMap((section) => section.items.map((item) => item.to));

describe('getNavSections', () => {
  it('gives an admin every page, with Analytics still on the role', () => {
    expect(paths(ADMIN, 'ADMIN')).toEqual([
      '/dashboard',
      '/profile',
      '/repairs',
      '/repairs/new',
      '/history',
      '/analytics',
      '/knowledge-base',
      '/users',
      '/audit-logs',
    ]);
  });

  it('gives a mechanic their own repairs and the knowledge base, nothing to administer', () => {
    const sections = getNavSections(holding(MECHANIC), 'MECHANIC');

    expect(sections.map((s) => s.title)).toEqual(['General', 'Vehicle repairs', 'Knowledge base']);
    expect(sections[1].items.map((i) => i.label)).toEqual(['My repairs', 'Repair history']);
  });

  it('labels the list for every ticket when the chief holds ticket.view_all, with no New repair', () => {
    const repairs = getNavSections(holding(CHIEF), 'CHIEF_MECHANIC')[1];

    expect(repairs.items.map((i) => i.label)).toEqual(['Repair tickets', 'Repair history']);
  });

  it('follows the keys, not the role: an admin without audit.view loses Audit logs', () => {
    const keys = ADMIN.filter((key) => key !== 'audit.view');

    expect(paths(keys, 'ADMIN')).not.toContain('/audit-logs');
  });

  it('drops a section with no item left', () => {
    const titles = getNavSections(holding(['ticket.view']), 'MECHANIC').map((s) => s.title);

    expect(titles).toEqual(['General', 'Vehicle repairs']);
  });

  it('builds the phone tabs from the same sections', () => {
    const tabs = getMobileTabs(getNavSections(holding(MECHANIC), 'MECHANIC'));

    expect(tabs.map((t) => t.to)).toEqual(['/dashboard', '/repairs', '/history', '/knowledge-base', '/profile']);
  });
});
