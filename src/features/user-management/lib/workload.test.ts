import { describe, expect, it } from 'vitest';
import type { MechanicOption, MechanicWorkload } from '../../../lib/api/vrmsConfigApi';
import type { TeamMember } from '../../../types';
import { DEFAULT_USER_FILTERS, hasActiveFilters, matchesUserFilters, readUserListState, writeUserListState } from './userFilters';
import { reassignCandidates, swapMechanic, withoutMechanic, workloadMap, workloadSummary, workStateOf, namesSummary, visibleTickets, TICKETS_SHOWN, coworkerSplit } from './workload';

// Feature 57: Occupied or Free, the counts, the filter in the URL, and what Unassign and Reassign send.

function person(id: string, role: string): TeamMember {
  return {
    id,
    name: id,
    email: `${id}@welinc.com`,
    isActive: true,
    isLocked: false,
    emailVerified: true,
    roles: [{ role, system: 'VRMS' }],
  } as unknown as TeamMember;
}

const zero = { OPEN: 0, ASSIGNED: 0, IN_PROGRESS: 0, ON_HOLD: 0, FOR_VERIFICATION: 0, OUTSOURCED: 0, PENDING_APPROVAL: 0 };
const row = (
  authUserId: string,
  occupied: boolean,
  byStatus: Partial<typeof zero> = {},
  assignable = true,
): MechanicWorkload => {
  const counts = { ...zero, ...byStatus };
  return { authUserId, occupied, assignable, byStatus: counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
};

const workload = workloadMap([
  row('busy', true, { IN_PROGRESS: 1, ASSIGNED: 2 }),
  row('idle', false, { ASSIGNED: 1 }),
  row('former', false, { ASSIGNED: 1 }, false),
]);

describe('workStateOf', () => {
  it('reads Occupied and Free from the server row', () => {
    expect(workStateOf(person('busy', 'MECHANIC'), workload)).toBe('occupied');
    expect(workStateOf(person('idle', 'CHIEF_MECHANIC'), workload)).toBe('free');
  });

  // covers: suite spec 0018 child 0002 AC-33, AC-34 (roster membership from the server, not the role)
  it('reads the roster from the server rows, custom roles included', () => {
    expect(workStateOf(person('busy', 'C_TIRE_SPECIALIST'), workload)).toBe('occupied');
    expect(workStateOf(person('new', 'MECHANIC'), workload)).toBeNull();
  });

  it('is null for someone who lost ticket.assignable, for an Admin, or before the workload loads', () => {
    expect(workStateOf(person('former', 'ADMIN'), workload)).toBeNull();
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
  it('reads a person with a roster row as a mechanic whatever roles they hold', () => {
    const both = { ...person('idle', 'ADMIN'), roles: [{ role: 'ADMIN', system: 'VRMS' }, { role: 'MECHANIC', system: 'VRMS' }] } as unknown as TeamMember;
    expect(workStateOf(both, workload)).toBe('free');
  });

  it('ignores a mechanic role held in another system', () => {
    const elsewhere = { ...person('vmms', 'MECHANIC'), roles: [{ role: 'MECHANIC', system: 'VMMS' }] } as unknown as TeamMember;
    expect(workStateOf(elsewhere, workload)).toBeNull();
  });

  it('shows nothing for someone without a roster row once the workload has loaded', () => {
    expect(workStateOf(person('idle', 'MECHANIC'), workloadMap([]))).toBeNull();
  });
});

describe('workStateOf for accounts that cannot work', () => {
  it('shows nothing for a deactivated mechanic who still holds tickets', () => {
    const left = { ...person('busy', 'MECHANIC'), isActive: false } as unknown as TeamMember;
    expect(workStateOf(left, workload)).toBeNull();
  });

  it('shows nothing for a deleted mechanic in the grace period', () => {
    const deleted = { ...person('busy', 'MECHANIC'), deleted: true } as unknown as TeamMember;
    expect(workStateOf(deleted, workload)).toBeNull();
  });

  it('keeps a deactivated mechanic out of both work filters', () => {
    const left = { ...person('busy', 'MECHANIC'), isActive: false } as unknown as TeamMember;
    const state = workStateOf(left, workload);
    expect(matchesUserFilters(left, { ...DEFAULT_USER_FILTERS, work: 'occupied' }, state)).toBe(false);
    expect(matchesUserFilters(left, { ...DEFAULT_USER_FILTERS, work: 'free' }, state)).toBe(false);
  });
});

describe('visibleTickets', () => {
  const tickets = Array.from({ length: 12 }, (_, i) => i);

  it('shows the first few until expanded, then all of them', () => {
    expect(visibleTickets(tickets, false)).toEqual(tickets.slice(0, TICKETS_SHOWN));
    expect(visibleTickets(tickets, true)).toEqual(tickets);
  });

  it('shows a short list as it is, and does not change the list it was given', () => {
    expect(visibleTickets([1, 2], false)).toEqual([1, 2]);
    expect(visibleTickets([], false)).toEqual([]);
    visibleTickets(tickets, true).pop();
    expect(tickets).toHaveLength(12);
  });
});

describe('namesSummary', () => {
  it('names one or two people in full', () => {
    expect(namesSummary(['Ana'], 2, 'more')).toBe('Ana');
    expect(namesSummary(['Ana', 'Ben'], 2, 'more')).toBe('Ana and Ben');
  });

  it('names a third person rather than saying "1 more"', () => {
    expect(namesSummary(['Ana', 'Ben', 'Cy'], 2, 'more')).toBe('Ana, Ben and Cy');
  });

  it('counts the rest once there are more than one extra', () => {
    expect(namesSummary(['Ana', 'Ben', 'Cy', 'Di'], 2, 'more')).toBe('Ana, Ben and 2 more');
    expect(namesSummary(Array.from({ length: 11 }, (_, i) => `P${i}`), 3, 'others')).toBe('P0, P1, P2 and 8 others');
  });

  it('says nothing when there is nobody to name', () => {
    expect(namesSummary([], 2, 'more')).toBe('');
  });

  it('keeps two people with the same name as two names', () => {
    expect(namesSummary(['Juan dela Cruz', 'Juan dela Cruz'], 2, 'more')).toBe('Juan dela Cruz and Juan dela Cruz');
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

describe('coworkerSplit', () => {
  it('shows up to three names in full', () => {
    expect(coworkerSplit([])).toEqual({ shown: [], hidden: 0 });
    expect(coworkerSplit(['A', 'B', 'C'])).toEqual({ shown: ['A', 'B', 'C'], hidden: 0 });
  });

  it('shows two names and counts the rest from four up', () => {
    expect(coworkerSplit(['A', 'B', 'C', 'D'])).toEqual({ shown: ['A', 'B'], hidden: 2 });
    expect(coworkerSplit(Array.from({ length: 11 }, (_, i) => `P${i}`)).hidden).toBe(9);
  });

  it('does not change the list it was given', () => {
    const names = ['A', 'B', 'C', 'D'];
    coworkerSplit(names);
    expect(names).toEqual(['A', 'B', 'C', 'D']);
  });
});
