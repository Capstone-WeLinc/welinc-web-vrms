import { describe, expect, it } from 'vitest';
import { openWorkSummary } from './openWorkCopy';

describe('openWorkCopy', () => {
  it('lists only the statuses that have tickets', () => {
    expect(openWorkSummary({ OPEN: 0, ASSIGNED: 2, IN_PROGRESS: 1, ON_HOLD: 0 })).toBe('2 assigned, 1 in progress');
    expect(openWorkSummary({ OPEN: 0 })).toBe('');
  });
});
