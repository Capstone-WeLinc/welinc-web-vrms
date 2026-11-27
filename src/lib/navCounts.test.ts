import { beforeEach, describe, expect, it, vi } from 'vitest';

const getNavCounts = vi.fn();
vi.mock('./api/navApi', () => ({ getNavCounts: () => getNavCounts() }));

import { readNavCountsForTest, refreshNavCounts, setNavCountsForTest } from './navCounts';

/** Lets the pending promise chain settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));


// covers: spec 0027 AC-7
describe('nav counts store', () => {
  beforeEach(() => {
    getNavCounts.mockReset();
  });

  it('reads nothing before anyone is signed in (no sidebar yet)', async () => {
    setNavCountsForTest(null, null);
    refreshNavCounts();
    await settle();

    expect(getNavCounts).not.toHaveBeenCalled();
  });

  it('reads again once after a move that lands during a read, so no move is missed', async () => {
    setNavCountsForTest({}, 'u1');
    let finish: (value: unknown) => void = () => {};
    getNavCounts.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve))).mockResolvedValue({ sentBack: 0 });

    refreshNavCounts();
    refreshNavCounts();
    refreshNavCounts();
    finish({ sentBack: 1 });
    await settle();
    await settle();

    expect(getNavCounts).toHaveBeenCalledTimes(2);
    expect(readNavCountsForTest()).toEqual({ sentBack: 0 });
  });

  it('keeps the last numbers after a failed read, and takes the next answer', async () => {
    setNavCountsForTest({ signoff: 3 }, 'u1');
    getNavCounts.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce({ signoff: 2 });

    refreshNavCounts();
    await settle();
    expect(readNavCountsForTest()).toEqual({ signoff: 3 });

    refreshNavCounts();
    await settle();
    expect(getNavCounts).toHaveBeenCalledTimes(2);
    expect(readNavCountsForTest()).toEqual({ signoff: 2 });
  });
});
