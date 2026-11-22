import { describe, expect, it } from 'vitest';
import { pickBanner } from './bannerPriority';

// Suite spec 0016, AC-12: offline, then signing out soon, then the no access note, then back online
describe('pickBanner', () => {
  it('shows nothing when nothing is active', () => {
    expect(pickBanner({})).toBeNull();
  });

  it('puts offline above everything', () => {
    expect(pickBanner({ offline: true, signingOut: true, noAccess: true, backOnline: true })).toBe('offline');
  });

  it('puts signing out soon above the no access note', () => {
    expect(pickBanner({ signingOut: true, noAccess: true })).toBe('signingOut');
  });

  it('lets back online wait behind the no access note', () => {
    expect(pickBanner({ noAccess: true, backOnline: true })).toBe('noAccess');
    expect(pickBanner({ backOnline: true })).toBe('backOnline');
  });
});
