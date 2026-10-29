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
  spendFor,
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
