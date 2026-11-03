import { describe, expect, it } from 'vitest';
import type { MechanicOption, MechanicWorkload } from '../../../lib/api/vrmsConfigApi';
import type { ManagedUser } from '../../../types';
import { DEFAULT_USER_FILTERS, hasActiveFilters, matchesUserFilters, readUserListState, writeUserListState } from './userFilters';
import { reassignCandidates, swapMechanic, withoutMechanic, workloadMap, workloadSummary, workloadTotal, workStateOf } from './workload';

// Feature 57: Occupied or Free, the counts, the filter in the URL, and what Unassign and Reassign send.

function person(id: string, role: string): ManagedUser {
  return {
    id,
    name: id,
    email: `${id}@welinc.com`,
    isActive: true,
    isLocked: false,
    emailVerified: true,
    roles: [{ role, system: 'VRMS' }],
  } as unknown as ManagedUser;
}

const zero = { OPEN: 0, ASSIGNED: 0, IN_PROGRESS: 0, ON_HOLD: 0, FOR_VERIFICATION: 0, OUTSOURCED: 0, PENDING_APPROVAL: 0 };
const row = (authUserId: string, occupied: boolean, byStatus: Partial<typeof zero> = {}): MechanicWorkload => {
  const counts = { ...zero, ...byStatus };
  return { authUserId, occupied, byStatus: counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
};

const workload = workloadMap([row('busy', true, { IN_PROGRESS: 1, ASSIGNED: 2 }), row('idle', false, { ASSIGNED: 1 })]);

describe('workStateOf', () => {
  it('reads Occupied and Free from the server row', () => {
    expect(workStateOf(person('busy', 'MECHANIC'), workload)).toBe('occupied');
    expect(workStateOf(person('idle', 'CHIEF_MECHANIC'), workload)).toBe('free');
  });

  it('treats a mechanic with no row as Free', () => {
    expect(workStateOf(person('new', 'MECHANIC'), workload)).toBe('free');
  });

  it('is null for an Admin, or before the workload loads', () => {
    expect(workStateOf(person('boss', 'ADMIN'), workload)).toBeNull();
    expect(workStateOf(person('busy', 'MECHANIC'), null)).toBeNull();
  });
});

describe('workloadSummary', () => {
  it('lists the open statuses that have tickets', () => {
    expect(workloadSummary(workload.get('busy'))).toBe('2 assigned, 1 in progress');
  });

  it('says so when there is nothing open', () => {
    expect(workloadSummary(row('x', false))).toBe('No open tickets');
    expect(workloadSummary(undefined)).toBe('No open tickets');
  });
});

describe('the work filter', () => {
  it('round trips through the URL and leaves the default out', () => {
    const params = writeUserListState({ ...DEFAULT_USER_FILTERS, work: 'occupied' }, 1);
    expect(params.toString()).toBe('work=occupied');
    expect(readUserListState(params).filters.work).toBe('occupied');
    expect(writeUserListState(DEFAULT_USER_FILTERS, 1).toString()).toBe('');
  });

  it('reads an unknown value as everyone', () => {
    expect(readUserListState(new URLSearchParams('work=lazy')).filters.work).toBe('all');
  });

  it('shows only mechanics in the chosen state', () => {
    const filters = { ...DEFAULT_USER_FILTERS, work: 'free' as const };
    expect(matchesUserFilters(person('idle', 'MECHANIC'), filters, 'free')).toBe(true);
    expect(matchesUserFilters(person('busy', 'MECHANIC'), filters, 'occupied')).toBe(false);
    expect(matchesUserFilters(person('boss', 'ADMIN'), filters, null)).toBe(false);
  });
});

describe('Unassign and Reassign payloads', () => {
  it('removes only this person', () => {
    expect(withoutMechanic(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('swaps in place, or just removes when the new one is already on it', () => {
    expect(swapMechanic(['a', 'b'], 'a', 'c')).toEqual(['c', 'b']);
    expect(swapMechanic(['a', 'b'], 'a', 'b')).toEqual(['b']);
  });

  it('offers the fewest open tickets first, by name on a tie, and skips who is already on the ticket', () => {
    const m = (id: string, openCount: number, busy: boolean): MechanicOption => ({ id, name: id, isAvailable: openCount === 0, openCount, busy });
    const choices = reassignCandidates([m('ana', 3, true), m('ben', 2, false), m('cy', 0, false), m('abe', 2, true), m('me', 1, true)], ['me']);
    expect(choices.map((c) => c.id)).toEqual(['cy', 'abe', 'ben', 'ana']);
  });

  it('offers nobody when every mechanic is already on the ticket', () => {
    const m = (id: string): MechanicOption => ({ id, name: id, isAvailable: true, openCount: 0, busy: false });
    expect(reassignCandidates([m('a'), m('b')], ['a', 'b'])).toEqual([]);
  });
});

describe('workStateOf edge cases', () => {
  it('reads a person who holds a mechanic role next to another role as a mechanic', () => {
    const both = { ...person('both', 'ADMIN'), roles: [{ role: 'ADMIN', system: 'VRMS' }, { role: 'MECHANIC', system: 'VRMS' }] } as unknown as ManagedUser;
    expect(workStateOf(both, workload)).toBe('free');
  });

  it('ignores a mechanic role held in another system', () => {
    const elsewhere = { ...person('vmms', 'MECHANIC'), roles: [{ role: 'MECHANIC', system: 'VMMS' }] } as unknown as ManagedUser;
    expect(workStateOf(elsewhere, workload)).toBeNull();
  });

  it('treats every mechanic as Free once an empty workload has loaded', () => {
    expect(workStateOf(person('idle', 'MECHANIC'), workloadMap([]))).toBe('free');
  });
});

describe('workloadTotal', () => {
  it('says one open ticket in the singular and the rest in the plural', () => {
    expect(workloadTotal(row('x', true, { IN_PROGRESS: 1 }))).toBe('1 open ticket');
    expect(workloadTotal(row('x', true, { IN_PROGRESS: 1, ASSIGNED: 2 }))).toBe('3 open tickets');
  });

  it('says zero when there is no workload row', () => {
    expect(workloadTotal(undefined)).toBe('0 open tickets');
  });
});

describe('the work filter beside the other filters', () => {
  it('counts as an active filter on its own, and the defaults do not', () => {
    expect(hasActiveFilters({ ...DEFAULT_USER_FILTERS, work: 'occupied' })).toBe(true);
    expect(hasActiveFilters(DEFAULT_USER_FILTERS)).toBe(false);
  });

  it('round trips with search, role, status and page together', () => {
    const filters = { search: 'ana', role: 'MECHANIC' as const, status: 'ACTIVE' as const, work: 'free' as const };
    const params = writeUserListState(filters, 3);
    expect(params.get('work')).toBe('free');
    expect(readUserListState(params)).toEqual({ filters, page: 3 });
  });

  it('leaves work out of the address once it is back to everyone', () => {
    const params = writeUserListState({ ...DEFAULT_USER_FILTERS, work: 'all', role: 'MECHANIC' }, 1);
    expect(params.has('work')).toBe(false);
    expect(params.get('role')).toBe('MECHANIC');
  });

  it('reads an empty or wrongly cased value as everyone', () => {
    expect(readUserListState(new URLSearchParams('work=')).filters.work).toBe('all');
    expect(readUserListState(new URLSearchParams('work=Occupied')).filters.work).toBe('all');
  });

  it('applies work together with the role and the search', () => {
    const filters = { ...DEFAULT_USER_FILTERS, work: 'occupied' as const, role: 'MECHANIC' as const, search: 'busy' };
    expect(matchesUserFilters(person('busy', 'MECHANIC'), filters, 'occupied')).toBe(true);
    expect(matchesUserFilters(person('busy', 'CHIEF_MECHANIC'), filters, 'occupied')).toBe(false);
    expect(matchesUserFilters(person('other', 'MECHANIC'), filters, 'occupied')).toBe(false);
  });

  it('shows no mechanic under a work filter until the workload has loaded', () => {
    const filters = { ...DEFAULT_USER_FILTERS, work: 'occupied' as const };
    expect(matchesUserFilters(person('busy', 'MECHANIC'), filters, null)).toBe(false);
  });

  it('lets everyone through when the work filter is off, loaded or not', () => {
    expect(matchesUserFilters(person('boss', 'ADMIN'), DEFAULT_USER_FILTERS, null)).toBe(true);
    expect(matchesUserFilters(person('busy', 'MECHANIC'), DEFAULT_USER_FILTERS, 'occupied')).toBe(true);
  });
});

describe('Unassign and Reassign payload edge cases', () => {
  it('keeps the list as it is when the person is not on the ticket', () => {
    expect(withoutMechanic(['a', 'b'], 'z')).toEqual(['a', 'b']);
    expect(swapMechanic(['a', 'b'], 'z', 'c')).toEqual(['a', 'b']);
  });

  it('keeps the other mechanics in their order when one is swapped', () => {
    expect(swapMechanic(['a', 'b', 'c'], 'b', 'd')).toEqual(['a', 'd', 'c']);
  });

  it('does not change the list it was given', () => {
    const ids = ['a', 'b'];
    withoutMechanic(ids, 'a');
    swapMechanic(ids, 'a', 'c');
    expect(ids).toEqual(['a', 'b']);
  });

  it('offers nobody when there are no mechanics, and leaves the input unsorted', () => {
    expect(reassignCandidates([], ['a'])).toEqual([]);
    const m = (id: string, openCount: number): MechanicOption => ({ id, name: id, isAvailable: openCount === 0, openCount, busy: false });
    const input = [m('z', 5), m('a', 1)];
    reassignCandidates(input, []);
    expect(input.map((x) => x.id)).toEqual(['z', 'a']);
  });
});
