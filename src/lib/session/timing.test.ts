import { describe, expect, it } from 'vitest';
import {
  activityDelayMs,
  afterStatus,
  countdown,
  reconnectDelayMs,
  statusCheckDelayMs,
} from './timing';

const NOW = 1_000_000_000;

describe('activityDelayMs (AC-22)', () => {
  it('pings now when the last ping is a minute old or never happened', () => {
    expect(activityDelayMs(0, NOW)).toBe(0);
    expect(activityDelayMs(NOW - 60_000, NOW)).toBe(0);
  });
  it('waits for the rest of the minute after a recent ping', () => {
    expect(activityDelayMs(NOW - 15_000, NOW)).toBe(45_000);
  });
});

describe('statusCheckDelayMs (AC-23)', () => {
  it('checks 60 s before the cutoff, or now when that point has passed', () => {
    expect(statusCheckDelayMs(NOW + 30 * 60_000, NOW)).toBe(29 * 60_000);
    expect(statusCheckDelayMs(NOW + 30_000, NOW)).toBe(0);
  });
});

describe('afterStatus (AC-23)', () => {
  it('reschedules when the server cutoff moved past the warning point', () => {
    expect(afterStatus(NOW + 10 * 60_000, NOW)).toBe('reschedule');
  });
  it('warns when the cutoff is within the minute, allowing a little clock noise', () => {
    expect(afterStatus(NOW + 60_000, NOW)).toBe('warn');
    expect(afterStatus(NOW + 64_000, NOW)).toBe('warn');
    expect(afterStatus(NOW - 1, NOW)).toBe('warn');
  });
});

describe('reconnectDelayMs (AC-25)', () => {
  it('retries at 5, 15 and 30 s, then every 30 s', () => {
    expect([0, 1, 2, 3, 9].map(reconnectDelayMs)).toEqual([5_000, 15_000, 30_000, 30_000, 30_000]);
  });
});

describe('countdown', () => {
  it('shows minutes and seconds and never goes below zero', () => {
    expect(countdown(65_000)).toBe('1:05');
    expect(countdown(8_100)).toBe('0:09');
    expect(countdown(-5)).toBe('0:00');
  });
});
