import { describe, expect, it } from 'vitest';
import {
  activityDelayMs,
  afterStatus,
  countdown,
  reconnectDelayMs,
  spokenTimeLeft,
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
  // covers: suite spec 0016 AC-12 (the check moved from 60 s to 120 s before the cutoff)
  it('checks 120 s before the cutoff, or now when that point has passed', () => {
    expect(statusCheckDelayMs(NOW + 30 * 60_000, NOW)).toBe(28 * 60_000);
    expect(statusCheckDelayMs(NOW + 90_000, NOW)).toBe(0);
  });
});

describe('afterStatus (AC-23)', () => {
  it('reschedules when the server cutoff moved past the warning point', () => {
    expect(afterStatus(NOW + 10 * 60_000, NOW)).toBe('reschedule');
  });
  it('warns when the cutoff is within the two minutes, allowing a little clock noise', () => {
    expect(afterStatus(NOW + 120_000, NOW)).toBe('warn');
    expect(afterStatus(NOW + 124_000, NOW)).toBe('warn');
    expect(afterStatus(NOW + 126_000, NOW)).toBe('reschedule');
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

// covers: suite spec 0016 AC-12 (the spoken line: minutes once, then the 30 seconds)
describe('spokenTimeLeft', () => {
  it('says whole minutes while a minute or more is left', () => {
    expect(spokenTimeLeft(120_000)).toBe('Signing out in 2 minutes');
    expect(spokenTimeLeft(119_200)).toBe('Signing out in 2 minutes');
    expect(spokenTimeLeft(65_000)).toBe('Signing out in 1 minute');
  });
  it('says the seconds under a minute', () => {
    expect(spokenTimeLeft(30_000)).toBe('Signing out in 30 seconds');
    expect(spokenTimeLeft(1_000)).toBe('Signing out in 1 second');
    expect(spokenTimeLeft(-5)).toBe('Signing out in 0 seconds');
  });
});
