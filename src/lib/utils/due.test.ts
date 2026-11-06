import { describe, expect, it } from 'vitest';
import type { RepairTicket } from '../../types';
import { dayCount, dueLabel, dueValue, isOverdue, toTime, wholeDays } from './due';

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

describe('dueValue (spec 0024, AC-17)', () => {
  const now = new Date(2026, 10, 6, 12, 0).getTime();
  const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).toISOString();
  const value = (status: RepairTicket['status'], dueAt: string | null) => dueValue({ status, dueAt }, now);

  it('reads overdue as days overdue under the date', () => {
    expect(value('IN_PROGRESS', at(2026, 10, 4))).toEqual({ date: 'Nov 4', note: '2 days overdue', overdue: true });
    expect(value('FOR_VERIFICATION', at(2026, 10, 5))).toEqual({ date: 'Nov 5', note: '1 day overdue', overdue: true });
  });
  it('reads Today within the same 24 hours, a few hours past due still overdue', () => {
    expect(value('IN_PROGRESS', at(2026, 10, 6, 9))).toEqual({ date: 'Today', note: null, overdue: true });
    expect(value('IN_PROGRESS', at(2026, 10, 6, 18))).toEqual({ date: 'Today', note: null, overdue: false });
  });
  it('reads a later date with the days left', () => {
    expect(value('ASSIGNED', at(2026, 10, 9))).toEqual({ date: 'Nov 9', note: 'in 3 days', overdue: false });
  });
  it('adds the year only when it differs', () => {
    expect(value('OPEN', at(2027, 0, 5))?.date).toBe('Jan 5, 2027');
  });
  it('shows the date alone on Closed and Cancelled', () => {
    expect(value('CLOSED', at(2026, 10, 4))).toEqual({ date: 'Nov 4', note: null, overdue: false });
    expect(value('CANCELLED', at(2026, 10, 4))).toEqual({ date: 'Nov 4', note: null, overdue: false });
  });
  it('has no value without a due date', () => {
    expect(value('OPEN', null)).toBeNull();
  });
});
