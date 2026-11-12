import { describe, expect, it } from 'vitest';
import { decisionFailureMessage, pendingChipLabel, pendingCountLabel } from './deletionRequests';

// covers: suite spec 0012 AC-23 (chip count, "50+" past one page), AC-11 (decision failures in words)

describe('pendingCountLabel', () => {
  it('shows the plain count on one page', () => {
    expect(pendingCountLabel(3, false)).toBe('3');
  });

  it('adds a plus when there is another page', () => {
    expect(pendingCountLabel(50, true)).toBe('50+');
  });
});

describe('pendingChipLabel', () => {
  it('says none waiting at zero', () => {
    expect(pendingChipLabel(0, false)).toBe('Deletion requests, none waiting');
  });

  it('reads the count with the words', () => {
    expect(pendingChipLabel(2, false)).toBe('Deletion requests, 2 waiting');
    expect(pendingChipLabel(50, true)).toBe('Deletion requests, 50+ waiting');
  });
});

describe('decisionFailureMessage', () => {
  it.each(['NOT_PENDING', 'LAST_ADMIN', 'SELF_DECISION', 'NOT_RESTORABLE'])('has its own words for %s', (code) => {
    expect(decisionFailureMessage(code, 'fallback')).not.toBe('fallback');
  });

  it('uses the fallback for an unknown or missing code', () => {
    expect(decisionFailureMessage('WHATEVER', 'fallback')).toBe('fallback');
    expect(decisionFailureMessage(undefined, 'fallback')).toBe('fallback');
  });
});
