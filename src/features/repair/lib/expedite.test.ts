import { describe, expect, it } from 'vitest';
import {
  acceptBody,
  acceptExpediteSchema,
  neededByDay,
  stepUpPriority,
  toLocalInput,
  tripStatusLabel,
  tripWhen,
} from './expedite';

// covers: spec 0029 AC-16 and AC-19 (the trips card and the Accept dialog's rules)

describe('stepUpPriority (AC-19)', () => {
  it('goes one step up and stays at Critical', () => {
    expect(stepUpPriority('LOW')).toBe('MEDIUM');
    expect(stepUpPriority('MEDIUM')).toBe('HIGH');
    expect(stepUpPriority('HIGH')).toBe('CRITICAL');
    expect(stepUpPriority('CRITICAL')).toBe('CRITICAL');
  });
});

describe('trip wording (AC-16)', () => {
  it('shows the calendar day BMS sent, with the dispatch time when there is one', () => {
    expect(tripWhen({ serviceDate: '2026-11-29', dispatchTime: '06:30' })).toBe('Sun, Nov 29, 6:30 AM');
    expect(tripWhen({ serviceDate: '2026-12-01', dispatchTime: null })).toBe('Tue, Dec 1');
  });

  it('names the statuses and passes a new one through readably', () => {
    expect(tripStatusLabel('CONFIRMED')).toBe('Confirmed');
    expect(tripStatusLabel('PENDING')).toBe('Pending');
    expect(tripStatusLabel('ON_STANDBY')).toBe('On standby');
  });

  it('says when BMS needs the truck, or nothing', () => {
    expect(neededByDay('2026-12-01')).toBe('Dec 1');
    expect(neededByDay(null)).toBeNull();
  });
});

describe('acceptBody (AC-19)', () => {
  const ticket = { dueAt: '2026-12-01T01:00:00.000Z', updatedAt: '2026-11-28T01:00:00.000Z' };

  it('leaves the date out when the field still shows the ticket’s date, or is empty', () => {
    expect(acceptBody({ priority: 'HIGH', dueAt: toLocalInput(ticket.dueAt) }, ticket)).toEqual({
      priority: 'HIGH',
      updatedAt: ticket.updatedAt,
    });
    expect(acceptBody({ priority: 'HIGH', dueAt: '' }, ticket)).not.toHaveProperty('dueAt');
  });

  it('sends a changed date as ISO', () => {
    const body = acceptBody({ priority: 'CRITICAL', dueAt: '2026-11-30T17:00' }, ticket);
    expect(body.dueAt).toBe(new Date('2026-11-30T17:00').toISOString());
  });

  it('refuses a date that isn’t one', () => {
    expect(acceptExpediteSchema.safeParse({ priority: 'HIGH', dueAt: 'soon' }).success).toBe(false);
    expect(acceptExpediteSchema.safeParse({ priority: 'HIGH', dueAt: '' }).success).toBe(true);
  });
});
