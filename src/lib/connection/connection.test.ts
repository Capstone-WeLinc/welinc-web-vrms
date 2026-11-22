import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BACK_ONLINE_MS, getConnection, reportRequestFailed, reportRequestOk, resetConnectionForTests } from './connection';

// Suite spec 0016, AC-12: the offline signal behind the banners
describe('the offline signal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetConnectionForTests();
  });
  afterEach(() => vi.useRealTimers());

  it('goes offline on a network error and stays until a request succeeds', () => {
    reportRequestFailed(undefined);
    expect(getConnection().offline).toBe(true);
    reportRequestFailed(undefined);
    expect(getConnection().offline).toBe(true);
    reportRequestOk();
    expect(getConnection()).toMatchObject({ offline: false });
    expect(getConnection().backOnlineUntil).not.toBeNull();
  });

  it('needs two 5xx answers in a row', () => {
    reportRequestFailed(502);
    expect(getConnection().offline).toBe(false);
    reportRequestFailed(503);
    expect(getConnection().offline).toBe(true);
  });

  it('starts the 5xx count again after any other answer', () => {
    reportRequestFailed(500);
    reportRequestFailed(404);
    reportRequestFailed(500);
    expect(getConnection().offline).toBe(false);
  });

  it('ignores a cancelled request', () => {
    reportRequestFailed(undefined, true);
    expect(getConnection().offline).toBe(false);
  });

  it('shows back online for 4 seconds', () => {
    reportRequestFailed(undefined);
    reportRequestOk();
    vi.advanceTimersByTime(BACK_ONLINE_MS);
    expect(getConnection()).toEqual({ offline: false, backOnlineUntil: null });
  });
});
