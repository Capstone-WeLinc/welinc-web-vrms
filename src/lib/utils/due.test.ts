import { describe, expect, it } from 'vitest';
import type { RepairTicket } from '../../types';
import { dayCount, dueLabel, dueValue, isDueSoon, isOverdue, spanText, toTime, wholeDays } from './due';

// Spec 0002 due rules. Every helper takes `now`, so the tests never touch the clock.

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
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
  it('is null without a parsable due date', () => {
    expect(dueLabel({ status: 'ASSIGNED', dueAt: null }, now)).toBeNull();
    expect(dueLabel({ status: 'ASSIGNED', dueAt: 'junk' }, now)).toBeNull();
  });

  it('reads overdue in days, and in hours inside the first day (spec 0030, AC-12)', () => {
    expect(dueLabel({ status: 'ASSIGNED', dueAt: at(-3 * DAY - 5) }, now)).toEqual({ text: 'Overdue by 3 days', overdue: true, dueSoon: false });
    expect(dueLabel({ status: 'ASSIGNED', dueAt: at(-5 * HOUR - 5) }, now)).toEqual({ text: 'Overdue by 5 h', overdue: true, dueSoon: false });
    expect(dueLabel({ status: 'ASSIGNED', dueAt: at(-1000) }, now)).toEqual({ text: 'Overdue by under 1 h', overdue: true, dueSoon: false });
  });

  it('reads the time left in days, and in hours under 24 h', () => {
    expect(dueLabel({ status: 'ASSIGNED', dueAt: at(2 * DAY + 5) }, now)).toEqual({ text: 'Due in 2 days', overdue: false, dueSoon: false });
    expect(dueLabel({ status: 'ASSIGNED', dueAt: at(DAY + 1) }, now)).toEqual({ text: 'Due in 1 day', overdue: false, dueSoon: false });
    expect(dueLabel({ status: 'ASSIGNED', dueAt: at(5 * HOUR + 5) }, now)?.text).toBe('Due in 5 h');
  });

  it('still labels a finished ticket by its date but never as overdue', () => {
    expect(dueLabel({ status: 'CLOSED', dueAt: at(-DAY) }, now)?.overdue).toBe(false);
  });
});

describe('isDueSoon (spec 0030, AC-11)', () => {
  it('turns on once the fetch time passes dueSoonAt', () => {
    expect(isDueSoon({ status: 'IN_PROGRESS', dueAt: at(4 * HOUR), dueSoonAt: at(-1) }, now)).toBe(true);
    expect(isDueSoon({ status: 'IN_PROGRESS', dueAt: at(4 * HOUR), dueSoonAt: at(0) }, now)).toBe(true);
    expect(isDueSoon({ status: 'IN_PROGRESS', dueAt: at(30 * HOUR), dueSoonAt: at(6 * HOUR) }, now)).toBe(false);
  });
  it('is never on for an overdue, finished or undated ticket', () => {
    expect(isDueSoon({ status: 'IN_PROGRESS', dueAt: at(-1), dueSoonAt: at(-HOUR) }, now)).toBe(false);
    expect(isDueSoon({ status: 'CLOSED', dueAt: at(HOUR), dueSoonAt: at(-HOUR) }, now)).toBe(false);
    expect(isDueSoon({ status: 'OPEN', dueAt: null, dueSoonAt: null }, now)).toBe(false);
    expect(isDueSoon({ status: 'OPEN', dueAt: at(HOUR) }, now)).toBe(false);
  });
  it('carries into dueLabel', () => {
    expect(dueLabel({ status: 'ASSIGNED', dueAt: at(3 * HOUR), dueSoonAt: at(-HOUR) }, now)).toEqual({ text: 'Due soon, in 3 h', overdue: false, dueSoon: true });
  });
});

describe('spanText', () => {
  it('counts hours under a day and days after', () => {
    expect(spanText(-5)).toBe('under 1 h');
    expect(spanText(HOUR - 1)).toBe('under 1 h');
    expect(spanText(HOUR)).toBe('1 h');
    expect(spanText(DAY - 1)).toBe('23 h');
    expect(spanText(DAY)).toBe('1 day');
  });
});

describe('dueValue (spec 0024, AC-17; spec 0030, AC-12)', () => {
  const now = new Date(2026, 10, 6, 12, 0).getTime();
  const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).toISOString();
  const value = (status: RepairTicket['status'], dueAt: string | null, dueSoonAt: string | null = null) => dueValue({ status, dueAt, dueSoonAt }, now);

  it('reads overdue as days overdue under the date and time', () => {
    expect(value('IN_PROGRESS', at(2026, 10, 4))).toEqual({ date: 'Nov 4, 12:00 PM', note: '2 days overdue', overdue: true, dueSoon: false });
    expect(value('FOR_VERIFICATION', at(2026, 10, 5))).toEqual({ date: 'Nov 5, 12:00 PM', note: '1 day overdue', overdue: true, dueSoon: false });
  });
  it('reads hours within 24 h either side', () => {
    expect(value('IN_PROGRESS', at(2026, 10, 6, 9))).toEqual({ date: 'Nov 6, 9:00 AM', note: '3 h overdue', overdue: true, dueSoon: false });
    expect(value('IN_PROGRESS', at(2026, 10, 6, 18), at(2026, 10, 6, 6))).toEqual({ date: 'Nov 6, 6:00 PM', note: 'in 6 h', overdue: false, dueSoon: true });
  });
  it('reads a later date with the days left', () => {
    expect(value('ASSIGNED', at(2026, 10, 9))).toEqual({ date: 'Nov 9, 12:00 PM', note: 'in 3 days', overdue: false, dueSoon: false });
  });
  it('uses the singular for one day either side', () => {
    expect(value('IN_PROGRESS', at(2026, 10, 5))?.note).toBe('1 day overdue');
    expect(value('ASSIGNED', at(2026, 10, 7))?.note).toBe('in 1 day');
  });
  it('adds the year only when it differs', () => {
    expect(value('OPEN', at(2027, 0, 5))?.date).toBe('Jan 5, 2027, 12:00 PM');
  });
  it('shows the date alone on Closed and Cancelled', () => {
    expect(value('CLOSED', at(2026, 10, 4))).toEqual({ date: 'Nov 4, 12:00 PM', note: null, overdue: false, dueSoon: false });
    expect(value('CANCELLED', at(2026, 10, 4), at(2026, 10, 3))).toEqual({ date: 'Nov 4, 12:00 PM', note: null, overdue: false, dueSoon: false });
  });
  it('has no value without a due date', () => {
    expect(value('OPEN', null)).toBeNull();
  });
});
