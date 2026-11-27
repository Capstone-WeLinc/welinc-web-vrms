import { describe, expect, it } from 'vitest';
import { dueDateSchema, hoursLabel, localToIso } from './dueDateEdit';

// Spec 0030, AC-8 and AC-9: the dialog's own checks. The server repeats them and wins.

const now = Date.parse('2026-11-27T08:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const iso = (offset: number) => new Date(now + offset).toISOString();
const parse = (values: Record<string, string>) => dueDateSchema(now).safeParse(values);
const fieldOf = (result: ReturnType<typeof parse>) => (result.success ? null : result.error.issues[0].path[0]);

describe('dueDateSchema', () => {
  it('takes a later date with a reason', () => {
    expect(parse({ mode: 'manual', dueAt: iso(3 * HOUR), reason: 'Parts arrive Friday' }).success).toBe(true);
  });
  it('refuses now, the past and over 90 days out (AC-8)', () => {
    expect(fieldOf(parse({ mode: 'manual', dueAt: iso(0), reason: 'Parts arrive Friday' }))).toBe('dueAt');
    expect(fieldOf(parse({ mode: 'manual', dueAt: iso(-HOUR), reason: 'Parts arrive Friday' }))).toBe('dueAt');
    expect(fieldOf(parse({ mode: 'manual', dueAt: iso(91 * 24 * HOUR), reason: 'Parts arrive Friday' }))).toBe('dueAt');
    expect(fieldOf(parse({ mode: 'manual', dueAt: '', reason: 'Parts arrive Friday' }))).toBe('dueAt');
  });
  it('needs no date to go back to automatic, but always a reason of 5 to 500 (AC-9)', () => {
    expect(parse({ mode: 'automatic', dueAt: '', reason: 'Plan changed' }).success).toBe(true);
    expect(fieldOf(parse({ mode: 'automatic', dueAt: '', reason: ' abc ' }))).toBe('reason');
    expect(fieldOf(parse({ mode: 'manual', dueAt: iso(HOUR), reason: 'x'.repeat(501) }))).toBe('reason');
  });
});

describe('localToIso and hoursLabel', () => {
  it('sends an offset and drops trailing zeros', () => {
    expect(localToIso('2026-12-01T09:00')).toMatch(/Z$/);
    expect(hoursLabel(6)).toBe('6 h');
    expect(hoursLabel(1.5)).toBe('1.5 h');
  });
});
