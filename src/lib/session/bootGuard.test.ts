import { describe, expect, it } from 'vitest';
import { afterBootRefused, BOOT_FLAG_MAX_AGE_MS, isFreshAttempt, refreshDelayMs, returnPath } from './bootGuard';

// covers: spec 0003 AC-20 (the boot loop guard and the deep link), AC-21 (refresh 60 s early)
describe('bootGuard', () => {
  const now = 1_800_000_000_000;

  it('goes to the login once, then gives up while the flag is fresh', () => {
    expect(afterBootRefused(null, now)).toBe('start');
    expect(afterBootRefused(String(now - 5_000), now)).toBe('give_up');
  });

  it('ignores a flag older than 2 minutes, from the future, or not a number', () => {
    expect(isFreshAttempt(String(now - BOOT_FLAG_MAX_AGE_MS), now)).toBe(false);
    expect(isFreshAttempt(String(now + 1_000), now)).toBe(false);
    expect(isFreshAttempt('abc', now)).toBe(false);
  });

  it('refreshes 60 s before expiry, never sooner than 5 s', () => {
    expect(refreshDelayMs(now + 15 * 60_000, now)).toBe(14 * 60_000);
    expect(refreshDelayMs(now + 30_000, now)).toBe(5_000);
  });

  it('keeps the path, query and hash of a deep link', () => {
    expect(returnPath({ pathname: '/repairs/abc', search: '?tab=photos', hash: '#p2' })).toBe(
      '/repairs/abc?tab=photos#p2',
    );
  });
});
