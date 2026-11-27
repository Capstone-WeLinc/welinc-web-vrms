import { describe, expect, it } from 'vitest';
import type { PermissionKey } from '../../lib/permissions/keys';
import { breadcrumbTrail, trailTitle } from './breadcrumbTrail';
import { getNavSections } from './navItems';

const CHIEF: PermissionKey[] = ['ticket.view', 'ticket.view_all', 'ticket.work', 'ticket.verify', 'config.read', 'knowledge.view', 'knowledge.suggest', 'knowledge.edit'];
const MECHANIC: PermissionKey[] = ['ticket.view', 'ticket.work', 'config.read', 'knowledge.view', 'knowledge.suggest'];
const nav = (keys: PermissionKey[]) => getNavSections((key) => keys.includes(key), { inRoster: true });

const labels = (pathname: string, search = '', keys = CHIEF, tail: string | null = null) =>
  breadcrumbTrail(pathname, search, nav(keys), tail)
    .map((crumb) => crumb.label)
    .join(' › ');

// covers: spec 0027 AC-9
describe('the top bar breadcrumb', () => {
  it('reads VRMS, the top level page by its nav label, then the sub page', () => {
    expect(labels('/dashboard')).toBe('VRMS › Dashboard');
    expect(labels('/')).toBe('VRMS › Dashboard');
    expect(labels('/repairs', '?view=signoff')).toBe('VRMS › Repair tickets › Waiting for sign off');
    expect(labels('/repairs', '?view=sentBack', MECHANIC)).toBe('VRMS › My repairs › Sent back to me');
    expect(labels('/knowledge-base/suggestions')).toBe('VRMS › Knowledge base › Suggestions');
    expect(labels('/repairs')).toBe('VRMS › Repair tickets');
  });

  it('names the record: the ticket number from the page, New repair from its route', () => {
    expect(labels('/repairs/0b0', '', CHIEF, 'REP-20261126-7J6W')).toBe('VRMS › Repair tickets › REP-20261126-7J6W');
    expect(labels('/repairs/new')).toBe('VRMS › Repair tickets › New repair');
  });

  it('gives Profile a crumb though it is not in the nav', () => {
    expect(labels('/profile')).toBe('VRMS › Profile');
  });

  it('links every crumb but the last; the page crumb drops the view', () => {
    const trail = breadcrumbTrail('/repairs', '?view=signoff', nav(CHIEF));

    expect(trail).toEqual([
      { label: 'VRMS', to: '/' },
      { label: 'Repair tickets', to: '/repairs' },
      { label: 'Waiting for sign off' },
    ]);
    const dashboard = breadcrumbTrail('/dashboard', '', nav(CHIEF));
    expect(dashboard[dashboard.length - 1]).toEqual({ label: 'Dashboard' });
  });
});

describe('the tab title', () => {
  it('names where you are, the most specific part first, ending in VRMS', () => {
    const title = (pathname: string, search = '', tail: string | null = null) => trailTitle(breadcrumbTrail(pathname, search, nav(CHIEF), tail));
    expect(title('/dashboard')).toBe('Dashboard · VRMS');
    expect(title('/repairs', '?view=signoff')).toBe('Waiting for sign off · Repair tickets · VRMS');
    expect(title('/repairs/0b0', '', 'REP-20261126-7J6W')).toBe('REP-20261126-7J6W · Repair tickets · VRMS');
    expect(title('/profile')).toBe('Profile · VRMS');
    expect(title('/nowhere')).toBe('VRMS');
  });
});
