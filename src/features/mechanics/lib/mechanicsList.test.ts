import { describe, expect, it } from 'vitest';
import type { MechanicRosterRow } from '../../../lib/api/vrmsConfigApi';
import {
  idsOf,
  keepOrder,
  matchesMechanicsFilters,
  needsSortAgain,
  readMechanicsFilters,
  sortRoster,
  writeMechanicsFilters,
} from './mechanicsList';

const row = (authUserId: string, over: Partial<MechanicRosterRow> = {}): MechanicRosterRow => ({
  authUserId,
  name: authUserId,
  email: `${authUserId}@welinc.com`,
  role: 'MECHANIC',
  isActive: true,
  occupied: false,
  total: 0,
  byStatus: {},
  ...over,
});

describe('Mechanics filters in the URL (spec 0022, AC-7)', () => {
  it('reads q and work, and an unknown work value as All', () => {
    expect(readMechanicsFilters(new URLSearchParams('q=%20Ana%20&work=free'))).toEqual({ search: 'Ana', work: 'free' });
    expect(readMechanicsFilters(new URLSearchParams('work=busy')).work).toBe('all');
  });

  it('cuts a long search to the name column length', () => {
    expect(readMechanicsFilters(new URLSearchParams(`q=${'a'.repeat(150)}`)).search).toHaveLength(100);
  });

  it('leaves defaults out of the URL', () => {
    expect(writeMechanicsFilters({ search: '', work: 'all' }).toString()).toBe('');
    expect(writeMechanicsFilters({ search: 'ana', work: 'occupied' }).toString()).toBe('q=ana&work=occupied');
  });

  it('matches the name anywhere, ignoring case, and the work state', () => {
    const ana = row('a', { name: 'Ana Reyes', occupied: true });
    expect(matchesMechanicsFilters(ana, { search: 'REY', work: 'all' })).toBe(true);
    expect(matchesMechanicsFilters(ana, { search: 'ana@', work: 'all' })).toBe(false);
    expect(matchesMechanicsFilters(ana, { search: '', work: 'occupied' })).toBe(true);
    expect(matchesMechanicsFilters(ana, { search: '', work: 'free' })).toBe(false);
  });
});

describe('Mechanics order (spec 0022, AC-8)', () => {
  it('puts Free first, then fewest open tickets, then name, with inactive people last', () => {
    const rows = [
      row('gone', { isActive: false, total: 0 }),
      row('busy', { occupied: true, total: 1 }),
      row('free-two', { total: 2 }),
      row('Ben', { total: 0 }),
      row('Ana', { total: 0 }),
    ];
    expect(idsOf(sortRoster(rows))).toEqual(['Ana', 'Ben', 'free-two', 'busy', 'gone']);
  });

  it('keeps the fixed order, drops people who left, and adds new people at the end', () => {
    const order = ['a', 'b', 'c'];
    const rows = [row('c', { occupied: true }), row('new', { total: 5 }), row('a'), row('new2')];
    expect(idsOf(keepOrder(rows, order))).toEqual(['a', 'c', 'new2', 'new']);
  });

  it('asks to sort again only when the shown order is not a fresh sort', () => {
    expect(needsSortAgain([row('a'), row('b')])).toBe(false);
    expect(needsSortAgain([row('a', { occupied: true }), row('b')])).toBe(true);
    expect(needsSortAgain([])).toBe(false);
  });
});
