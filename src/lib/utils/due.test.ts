import { describe, expect, it } from 'vitest';
import type { RepairTicket } from '../../types';
import { dayCount, dueLabel, dueLine, isOverdue, toTime, wholeDays } from './due';

// Spec 0002 due rules. Every helper takes `now`, so the tests never touch the clock.

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse('2026-10-29T08:00:00.000Z');
const at = (offsetMs: number) => new Date(now + offsetMs).toISOString();

describe('toTime', () => {
  it('parses ISO strings and returns null for empty or junk', () => {
    expect(toTime('2026-10-29T08:00:00.000Z')).toBe(now);
    expect(toTime(null)).toBeNull();
    expect(toTime(undefined)).toBeNull();
    expect(toTime('')).toBeNull();
    expect(toTime('not a date')).toBeNull();
  });
});

describe('wholeDays and dayCount', () => {
  it('rounds down and never goes below 0', () => {
    expect(wholeDays(0, DAY - 1)).toBe(0);
    expect(wholeDays(0, DAY)).toBe(1);
    expect(wholeDays(0, 2.9 * DAY)).toBe(2);
    expect(wholeDays(DAY, 0)).toBe(0);
  });

  it('says 1 day, not 1 days', () => {
    expect(dayCount(1)).toBe('1 day');
    expect(dayCount(0)).toBe('0 days');
    expect(dayCount(3)).toBe('3 days');
  });
});

describe('isOverdue', () => {
  it('needs an open ticket with a past due date', () => {
    expect(isOverdue({ status: 'IN_PROGRESS', dueAt: at(-1) }, now)).toBe(true);
    expect(isOverdue({ status: 'IN_PROGRESS', dueAt: at(1) }, now)).toBe(false);
  });

  it('counts ON_HOLD as open (AC-4a)', () => {
    expect(isOverdue({ status: 'ON_HOLD', dueAt: at(-DAY) }, now)).toBe(true);
  });

  it('never flags a finished ticket or one without a due date', () => {
    expect(isOverdue({ status: 'CLOSED', dueAt: at(-DAY) }, now)).toBe(false);
    expect(isOverdue({ status: 'CANCELLED', dueAt: at(-DAY) }, now)).toBe(false);
    expect(isOverdue({ status: 'ASSIGNED', dueAt: null }, now)).toBe(false);
  });
});

describe('dueLabel', () => {
  it('is null without a parsable due date (nothing sets dueAt until feature 42)', () => {
    expect(dueLabel({ status: 'ASSIGNED', dueAt: null }, now)).toBeNull();
    expect(dueLabel({ status: 'ASSIGNED', dueAt: 'junk' }, now)).toBeNull();
  });

  it('reads overdue text, with Due today inside the first day', () => {
    expect(dueLabel({ status: 'ASSIGNED', dueAt: at(-3 * DAY - 5) }, now)).toEqual({ text: 'Overdue by 3 days', overdue: true });
    expect(dueLabel({ status: 'ASSIGNED', dueAt: at(-1000) }, now)).toEqual({ text: 'Due today', overdue: true });
  });

  it('reads due soon text for a future date', () => {
    expect(dueLabel({ status: 'ASSIGNED', dueAt: at(2 * DAY + 5) }, now)).toEqual({ text: 'Due in 2 days', overdue: false });
    expect(dueLabel({ status: 'ASSIGNED', dueAt: at(DAY + 1) }, now)).toEqual({ text: 'Due in 1 day', overdue: false });
  });

  it('still labels a finished ticket by its date but never as overdue', () => {
    expect(dueLabel({ status: 'CLOSED', dueAt: at(-DAY) }, now)?.overdue).toBe(false);
  });
});

describe('dueLine (spec 0024, AC-17)', () => {
  const now = new Date(2026, 10, 6, 12, 0).getTime();
  const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).toISOString();
  const line = (status: RepairTicket['status'], dueAt: string | null) => dueLine({ status, dueAt }, now);

  it('reads overdue with the date', () => {
    expect(line('IN_PROGRESS', at(2026, 10, 4))).toEqual({ label: 'Overdue by 2 days, due', date: 'Nov 4', after: null, overdue: true });
    expect(line('FOR_VERIFICATION', at(2026, 10, 5))).toMatchObject({ label: 'Overdue by 1 day, due', overdue: true });
  });
  it('reads due today, overdue by a few hours still in the overdue colour', () => {
    expect(line('IN_PROGRESS', at(2026, 10, 6, 9))).toEqual({ label: 'Due today', date: null, after: null, overdue: true });
    expect(line('IN_PROGRESS', at(2026, 10, 6, 18))).toEqual({ label: 'Due today', date: null, after: null, overdue: false });
  });
  it('reads a later date with the days left', () => {
    expect(line('ASSIGNED', at(2026, 10, 9))).toEqual({ label: 'Due', date: 'Nov 9', after: ', in 3 days', overdue: false });
  });
  it('adds the year only when it differs', () => {
    expect(line('OPEN', at(2027, 0, 5))?.date).toBe('Jan 5, 2027');
  });
  it('shows the date alone on Closed and Cancelled', () => {
    expect(line('CLOSED', at(2026, 10, 4))).toEqual({ label: 'Due', date: 'Nov 4', after: null, overdue: false });
    expect(line('CANCELLED', at(2026, 10, 4))).toMatchObject({ after: null, overdue: false });
  });
  it('has no line without a due date', () => {
    expect(line('OPEN', null)).toBeNull();
  });
});
