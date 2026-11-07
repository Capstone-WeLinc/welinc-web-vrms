import { describe, expect, it } from 'vitest';
import { ticket } from '../../../test/ticketFixture';
import {
  attentionList,
  closedThisMonth,
  countMechanicOverdue,
  greeting,
  isWaiting,
  mechanicWorkList,
  pipelineCounts,
  signOffNames,
  spendFor,
  timeInStatus,
  verificationQueue,
  waitingText,
  waitTone,
} from './attention';

// Spec 0002 dashboard rules in the spec 0010 statuses (AC-16, AC-4a).

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse('2026-10-29T08:00:00.000Z');
const at = (offsetMs: number) => new Date(now + offsetMs).toISOString();

describe('isWaiting', () => {
  it('is For verification only', () => {
    expect(isWaiting(ticket({ status: 'FOR_VERIFICATION' }))).toBe(true);
    expect(isWaiting(ticket({ status: 'IN_PROGRESS' }))).toBe(false);
  });
});

describe('attentionList', () => {
  it('lists overdue first (oldest due first), then waiting ones, each once, up to the limit', () => {
    const lateMost = ticket({ id: 'late2', status: 'IN_PROGRESS', dueAt: at(-5 * DAY) });
    const late = ticket({ id: 'late1', status: 'ASSIGNED', dueAt: at(-DAY) });
    const waitingOverdue = ticket({ id: 'both', status: 'FOR_VERIFICATION', dueAt: at(-2 * DAY) });
    const waiting = ticket({ id: 'wait', status: 'FOR_VERIFICATION', updatedAt: at(-3 * DAY) });
    const fine = ticket({ id: 'fine', status: 'IN_PROGRESS', dueAt: at(DAY) });

    const ids = attentionList([fine, waiting, late, waitingOverdue, lateMost], now, 10).map((t) => t.id);
    expect(ids).toEqual(['late2', 'both', 'late1', 'wait']);
    expect(attentionList([fine, waiting, late, waitingOverdue, lateMost], now, 2)).toHaveLength(2);
  });

  it('puts tickets with no active mechanic after overdue and before waiting ones (spec 0011, AC-34)', () => {
    const late = ticket({ id: 'late', status: 'IN_PROGRESS', dueAt: at(-DAY) });
    const orphan = ticket({ id: 'orphan', status: 'IN_PROGRESS', needsMechanic: true, updatedAt: at(-DAY) });
    const gone = ticket({ id: 'gone', status: 'ASSIGNED', hasInactiveMechanic: true, updatedAt: at(-2 * DAY) });
    const waiting = ticket({ id: 'wait', status: 'FOR_VERIFICATION', updatedAt: at(-5 * DAY) });
    const ids = attentionList([waiting, orphan, gone, late], now, 10).map((t) => t.id);
    expect(ids).toEqual(['late', 'gone', 'orphan', 'wait']);
  });

  it('lists a ticket past Assigned with no mechanic as unstaffed (spec 0019, AC-13)', () => {
    const empty = ticket({ id: 'empty', status: 'FOR_VERIFICATION', mechanicCount: 0, updatedAt: at(-DAY) });
    const open = ticket({ id: 'open', status: 'OPEN', mechanicCount: 0, updatedAt: at(-DAY) });
    const staffed = ticket({ id: 'staffed', status: 'OUTSOURCED', mechanicCount: 1, updatedAt: at(-DAY) });
    expect(attentionList([open, staffed, empty], now, 10).map((t) => t.id)).toEqual(['empty']);
  });

  it('counts an ON_HOLD ticket past due as overdue (AC-4a)', () => {
    const held = ticket({ id: 'held', status: 'ON_HOLD', dueAt: at(-DAY) });
    expect(attentionList([held], now, 5).map((t) => t.id)).toEqual(['held']);
  });
});

describe('mechanicWorkList', () => {
  it('shows only assigned and in progress, overdue first, then soonest due, none last', () => {
    const none = ticket({ id: 'none', status: 'ASSIGNED', dueAt: null });
    const soon = ticket({ id: 'soon', status: 'IN_PROGRESS', dueAt: at(DAY) });
    const later = ticket({ id: 'later', status: 'ASSIGNED', dueAt: at(5 * DAY) });
    const overdue = ticket({ id: 'over', status: 'IN_PROGRESS', dueAt: at(-DAY) });
    const verification = ticket({ id: 'verify', status: 'FOR_VERIFICATION', dueAt: at(-DAY) });
    const ids = mechanicWorkList([none, later, verification, soon, overdue], now).map((t) => t.id);
    expect(ids).toEqual(['over', 'soon', 'later', 'none']);
  });

  it('counts overdue among the mechanic work statuses only', () => {
    const list = [
      ticket({ status: 'IN_PROGRESS', dueAt: at(-DAY) }),
      ticket({ status: 'FOR_VERIFICATION', dueAt: at(-DAY) }),
      ticket({ status: 'ASSIGNED', dueAt: at(DAY) }),
    ];
    expect(countMechanicOverdue(list, now)).toBe(1);
  });
});

describe('closedThisMonth and pipelineCounts', () => {
  const history = [
    { status: 'CLOSED' as const, closedAt: at(-DAY) },
    { status: 'CLOSED' as const, closedAt: '2026-09-15T00:00:00.000Z' },
    { status: 'CANCELLED' as const, closedAt: at(-DAY) },
    { status: 'CLOSED' as const, closedAt: null },
  ];

  it('counts only CLOSED rows closed in the current month', () => {
    expect(closedThisMonth(history, now)).toBe(1);
  });

  it('counts open tickets by stage and Closed for this month', () => {
    const active = [
      ticket({ status: 'ASSIGNED' }),
      ticket({ status: 'ASSIGNED' }),
      ticket({ status: 'IN_PROGRESS' }),
      ticket({ status: 'FOR_VERIFICATION' }),
      ticket({ status: 'ON_HOLD' }),
    ];
    expect(pipelineCounts(active, history, now)).toEqual({
      ASSIGNED: 2,
      IN_PROGRESS: 1,
      FOR_VERIFICATION: 1,
      CLOSED: 1,
    });
  });
});

describe('spendFor', () => {
  const rows = [
    { status: 'CLOSED' as const, createdAt: at(-10 * DAY), totalCost: 1000 },
    { status: 'IN_PROGRESS' as const, createdAt: at(-100 * DAY), totalCost: 500 },
    { status: 'CANCELLED' as const, createdAt: at(-DAY), totalCost: 9999 },
    { status: 'CLOSED' as const, createdAt: at(-DAY), totalCost: 0 },
    { status: 'CLOSED' as const, createdAt: at(-DAY), totalCost: null },
  ];

  it('leaves out cancelled tickets', () => {
    expect(spendFor(rows, 'all', now).total).toBe(1500);
  });

  it('averages only tickets with a cost above 0', () => {
    expect(spendFor(rows, 'all', now)).toEqual({ total: 1500, average: 750 });
  });

  it('filters by createdAt window', () => {
    expect(spendFor(rows, '90d', now).total).toBe(1000);
    expect(spendFor(rows, '365d', now).total).toBe(1500);
  });

  it('returns zeros for no rows', () => {
    expect(spendFor([], 'all', now)).toEqual({ total: 0, average: 0 });
  });
});

describe('greeting', () => {
  it('uses the trimmed name, or a plain welcome', () => {
    expect(greeting(' Ana ')).toBe('Welcome back, Ana.');
    expect(greeting('  ')).toBe('Welcome back.');
    expect(greeting(null)).toBe('Welcome back.');
  });
});

describe('verificationQueue', () => {
  const verifiable = (id: string, statusChangedAt: string, over = {}) =>
    ticket({
      id,
      status: 'FOR_VERIFICATION',
      statusChangedAt,
      can: { work: false, administer: false, verify: true, editCosts: false, unlock: false, assign: false, edit: false, editChecklist: false },
      ...over,
    });

  it('lists only waiting tickets the caller can verify, oldest wait first, id breaking ties', () => {
    const rows = [
      verifiable('c', '2026-10-03T00:00:00.000Z'),
      verifiable('b', '2026-10-01T00:00:00.000Z'),
      verifiable('a', '2026-10-01T00:00:00.000Z'),
      ticket({ id: 'own', status: 'FOR_VERIFICATION', statusChangedAt: '2026-09-01T00:00:00.000Z' }),
      ticket({ id: 'busy', status: 'IN_PROGRESS' }),
    ];
    expect(verificationQueue(rows).map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('waitingText', () => {
  const since = '2026-10-10T00:00:00.000Z';
  const base = Date.parse(since);
  const t = ticket({ statusChangedAt: since });
  const MIN = 60_000;

  it('reads under an hour, hours, then days, rounded down', () => {
    expect(waitingText(t, base + 59 * MIN)).toBe('Waiting under an hour');
    expect(waitingText(t, base + 60 * MIN)).toBe('Waiting 1 h');
    expect(waitingText(t, base + 23 * 60 * MIN + 59 * MIN)).toBe('Waiting 23 h');
    expect(waitingText(t, base + 24 * 60 * MIN)).toBe('Waiting 1 day');
    expect(waitingText(t, base + 50 * 60 * MIN)).toBe('Waiting 2 days');
  });

  it('counts a negative gap (clock skew) as 0', () => {
    expect(waitingText(t, base - 5 * 60 * MIN)).toBe('Waiting under an hour');
  });

  it('says the wait is unknown when the date cannot be read', () => {
    expect(waitingText(ticket({ statusChangedAt: 'not a date' }), base)).toBe('Waiting time unknown');
  });
});

// Spec 0022, AC-12: the chip's time in status, on the same thresholds as waitingText
describe('timeInStatus', () => {
  const since = '2026-10-10T00:00:00.000Z';
  const base = Date.parse(since);
  const MIN = 60_000;

  it('reads under an hour, hours, then days', () => {
    expect(timeInStatus(since, base + 59 * MIN)).toBe('under an hour');
    expect(timeInStatus(since, base + 3 * 60 * MIN)).toBe('3 h');
    expect(timeInStatus(since, base + 24 * 60 * MIN)).toBe('1 day');
    expect(timeInStatus(since, base + 4 * 24 * 60 * MIN)).toBe('4 days');
  });

  it('says time unknown for a missing or unreadable date', () => {
    expect(timeInStatus(undefined, base)).toBe('time unknown');
    expect(timeInStatus('not a date', base)).toBe('time unknown');
  });
});

describe('signOffNames', () => {
  it('names two, then a count, or says No mechanic', () => {
    expect(signOffNames([])).toBe('No mechanic');
    expect(signOffNames([{ id: '1', name: 'Ana' }, { id: '2', name: 'Ben' }])).toBe('Ana, Ben');
    expect(
      signOffNames([
        { id: '1', name: 'Ana' },
        { id: '2', name: 'Ben' },
        { id: '3', name: 'Cy' },
      ]),
    ).toBe('Ana, Ben +1 more');
  });
});

describe('waitTone', () => {
  const HOUR = 60 * 60 * 1000;
  it('is fresh under a day, stale from 24 h, late from 48 h', () => {
    expect(waitTone(at(-23 * HOUR), now)).toBe('fresh');
    expect(waitTone(at(-24 * HOUR), now)).toBe('stale');
    expect(waitTone(at(-47 * HOUR), now)).toBe('stale');
    expect(waitTone(at(-48 * HOUR), now)).toBe('late');
  });

  it('never alarms on a missing or unreadable date', () => {
    expect(waitTone(null, now)).toBe('fresh');
    expect(waitTone('not a date', now)).toBe('fresh');
  });
});
