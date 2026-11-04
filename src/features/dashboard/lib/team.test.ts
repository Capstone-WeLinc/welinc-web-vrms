import { describe, expect, it } from 'vitest';
import type { MechanicRosterRow } from '../../../lib/api/vrmsConfigApi';
import { ticket } from '../../../test/ticketFixture';
import type { RepairStatus } from '../../../types';
import { buildTeam, chipOf, compareChips, summaryText, teamSummary, workloadGroupOf, workloadSegments } from './team';

// Spec 0022, AC-7 and AC-10 to AC-15: the Team section's rules.

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = Date.parse('2026-11-05T08:00:00.000Z');
const at = (offsetMs: number) => new Date(now + offsetMs).toISOString();

function row(id: string, overrides: Partial<MechanicRosterRow> = {}): MechanicRosterRow {
  return {
    authUserId: id,
    mechanicId: `m-${id}`,
    name: `Name ${id}`,
    email: `${id}@welinc.com`,
    role: 'MECHANIC',
    isActive: true,
    occupied: false,
    total: 0,
    byStatus: {},
    ...overrides,
  };
}

function held(id: string, mechanicIds: string[], status: RepairStatus = 'ASSIGNED', extra = {}) {
  return ticket({
    id,
    status,
    mechanicCount: mechanicIds.length,
    mechanics: mechanicIds.map((m) => ({ id: m, name: `Ticket name ${m}` })),
    ...extra,
  });
}

describe('teamSummary', () => {
  it('counts working, with work waiting and free over the rows it gets', () => {
    const summary = teamSummary([
      row('a', { occupied: true, total: 2 }),
      row('b', { total: 1 }),
      row('c'),
      row('gone', { isActive: false, total: 1 }),
    ]);
    expect(summary).toEqual({ working: 1, waiting: 2, free: 1 });
    expect(summaryText(summary)).toBe('1 working · 2 with work waiting · 1 free');
  });
});

describe('buildTeam', () => {
  it('leaves the viewer out everywhere, counts included', () => {
    const team = buildTeam([row('me', { total: 1, occupied: true }), row('a')], [held('t1', ['m-me'])], 'me', now);
    expect(team.people).toEqual([]);
    expect(team.free.map((r) => r.authUserId)).toEqual(['a']);
    expect(team.summary).toEqual({ working: 0, waiting: 0, free: 1 });
  });

  it('says the roster is empty when only the viewer is on it', () => {
    expect(buildTeam([row('me')], [], 'me', now).empty).toBe(true);
  });

  it('joins chips on mechanicId, never the name', () => {
    const team = buildTeam(
      [row('a', { total: 1, name: 'Same' }), row('b', { total: 1, name: 'Same' })],
      [held('t1', ['m-b'])],
      undefined,
      now,
    );
    const b = team.people.find((p) => p.key === 'b');
    expect(b?.chips.map((c) => c.ticket.id)).toEqual(['t1']);
    expect(team.people.find((p) => p.key === 'a')?.chips).toEqual([]);
    expect(team.shared.has('same')).toBe(true);
  });

  it('sorts inactive first, then overdue, then highest total, then name; Occupied never moves a row', () => {
    const team = buildTeam(
      [
        row('busy', { total: 5, occupied: true }),
        row('late', { total: 1 }),
        row('gone', { total: 1, isActive: false }),
        row('b', { total: 2, name: 'Bea' }),
        row('a', { total: 2, name: 'Ana', occupied: true }),
      ],
      [held('t1', ['m-late'], 'ASSIGNED', { dueAt: at(-DAY) })],
      undefined,
      now,
    );
    expect(team.people.map((p) => p.key)).toEqual(['gone', 'late', 'busy', 'a', 'b']);
  });

  it('shows 3 chips and "+N more" from the roster total', () => {
    const tickets = ['t1', 't2', 't3', 't4'].map((id) => held(id, ['m-a']));
    const [person] = buildTeam([row('a', { total: 4 })], tickets, undefined, now).people;
    expect(person.chips).toHaveLength(3);
    expect(person.more).toBe(1);
    // A total at 3 or below has no "+N more", even when the join is short (poll lag)
    const [short] = buildTeam([row('a', { total: 3 })], [held('t1', ['m-a'])], undefined, now).people;
    expect(short.more).toBe(0);
  });

  it('lists open tickets with no mechanic, and a fallback row for a mechanic missing from the roster', () => {
    const team = buildTeam(
      [row('a', { total: 1 })],
      [held('lost', [], 'IN_PROGRESS'), held('lag', ['m-new']), held('mine', ['m-a'])],
      undefined,
      now,
    );
    expect(team.noMechanic.map((t) => t.id)).toEqual(['lost']);
    const fallback = team.people[team.people.length - 1];
    expect(fallback?.row).toBeNull();
    expect(fallback?.name).toBe('Ticket name m-new');
    expect(fallback?.chips.map((c) => c.ticket.id)).toEqual(['lag']);
  });

  it('keeps an inactive person with no work out of every list', () => {
    const team = buildTeam([row('gone', { isActive: false })], [], undefined, now);
    expect(team.people).toEqual([]);
    expect(team.free).toEqual([]);
  });

  it('lists free people by name', () => {
    const team = buildTeam([row('z', { name: 'Zed' }), row('a', { name: 'Ana' })], [], undefined, now);
    expect(team.free.map((r) => r.name)).toEqual(['Ana', 'Zed']);
  });
});

describe('chip order and text', () => {
  it('goes overdue first, then workflow order, then oldest in status, a missing date last', () => {
    const late = held('late', [], 'ON_HOLD', { dueAt: at(-DAY) });
    const progressOld = held('old', [], 'IN_PROGRESS', { statusChangedAt: at(-2 * DAY) });
    const progressNew = held('new', [], 'IN_PROGRESS', { statusChangedAt: at(-HOUR) });
    const progressUnknown = held('unknown', [], 'IN_PROGRESS', { statusChangedAt: 'not a date' });
    const assigned = held('assigned', [], 'ASSIGNED');
    const ids = [progressUnknown, progressNew, assigned, late, progressOld].sort(compareChips(now)).map((t) => t.id);
    expect(ids).toEqual(['late', 'assigned', 'old', 'new', 'unknown']);
  });

  it('reads status and time in status, with the overdue text', () => {
    const chip = chipOf(held('t', [], 'ON_HOLD', { statusChangedAt: at(-4 * DAY), dueAt: at(-2 * DAY) }), now);
    expect(chip.text).toBe('On hold · 4 days');
    expect(chip.overdue).toBe('Overdue by 2 days');
    expect(chipOf(held('t', [], 'IN_PROGRESS', { statusChangedAt: at(-3 * HOUR) }), now)).toMatchObject({
      text: 'In progress · 3 h',
      overdue: null,
    });
  });
});

describe('workloadSegments', () => {
  it('groups open counts in bar order and drops empty groups', () => {
    expect(workloadSegments({ IN_PROGRESS: 1, ON_HOLD: 2, OUTSOURCED: 1, ASSIGNED: 0 })).toEqual([
      { key: 'IN_PROGRESS', label: 'In progress', count: 1 },
      { key: 'OTHER', label: 'On hold and other', count: 3 },
    ]);
  });

  it('maps a status to its group', () => {
    expect(workloadGroupOf('FOR_VERIFICATION')).toBe('FOR_VERIFICATION');
    expect(workloadGroupOf('ON_HOLD')).toBe('OTHER');
  });
});
