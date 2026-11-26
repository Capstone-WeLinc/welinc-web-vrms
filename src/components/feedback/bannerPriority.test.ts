import { describe, expect, it } from 'vitest';
import { pickBanner } from './bannerPriority';

// Suite spec 0016, AC-12: offline, then the no access note, then back online (suite spec 0019
// AC-25: signing out soon is a toast, never in this order)
describe('pickBanner', () => {
  it('shows nothing when nothing is active', () => {
    expect(pickBanner({})).toBeNull();
  });

  it('puts offline above everything', () => {
    expect(pickBanner({ offline: true, reconnecting: true, noAccess: true, backOnline: true })).toBe('offline');
  });

  it('puts reconnecting above the no access note', () => {
    expect(pickBanner({ reconnecting: true, noAccess: true })).toBe('reconnecting');
  });

  it('lets back online wait behind the no access note', () => {
    expect(pickBanner({ noAccess: true, backOnline: true })).toBe('noAccess');
    expect(pickBanner({ backOnline: true })).toBe('backOnline');
  });
});
