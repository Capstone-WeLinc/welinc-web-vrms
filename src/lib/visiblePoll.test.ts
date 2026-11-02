import { describe, expect, it } from 'vitest';
import { isNewer, POLL_BACKOFF_MS, pollDelay, TICKET_POLL_MS } from './visiblePoll';

// Spec 0019, AC-21: the shared refetch rhythm.

describe('pollDelay', () => {
  it('polls every 3 seconds, the VR-RL-12 target', () => {
    expect(TICKET_POLL_MS).toBe(3_000);
    expect(pollDelay(0)).toBe(3_000);
  });

  it('keeps 3 seconds through two failures in a row', () => {
    expect(pollDelay(1)).toBe(3_000);
    expect(pollDelay(2)).toBe(3_000);
  });

  it('backs off to 15 seconds from the third failure in a row', () => {
    expect(POLL_BACKOFF_MS).toBe(15_000);
    expect(pollDelay(3)).toBe(15_000);
    expect(pollDelay(10)).toBe(15_000);
  });
});

describe('isNewer', () => {
  const base = { id: 't1', updatedAt: '2026-11-03T01:00:00.000Z', priority: 'LOW' };

  it('takes a later version', () => {
    expect(isNewer(base, { ...base, updatedAt: '2026-11-03T01:00:01.000Z', priority: 'HIGH' })).toBe(true);
  });

  it('takes a change with the same version, such as a ticked step', () => {
    expect(isNewer(base, { ...base, priority: 'HIGH' })).toBe(true);
  });

  it('skips an identical ticket, so nothing on the page redraws', () => {
    expect(isNewer(base, { ...base })).toBe(false);
  });

  it('never shows an older version over a save that answered first', () => {
    expect(isNewer(base, { ...base, updatedAt: '2026-11-03T00:59:59.000Z', priority: 'HIGH' })).toBe(false);
  });
});
