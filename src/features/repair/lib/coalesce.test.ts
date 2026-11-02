import { describe, expect, it } from 'vitest';
import { createCoalescer } from './coalesce';

describe('createCoalescer', () => {
  it('turns 50 calls made during one run into two runs', async () => {
    const coalesce = createCoalescer();
    let runs = 0;
    const run = () => Promise.resolve(++runs);
    const results = await Promise.all(Array.from({ length: 50 }, () => coalesce(run)));
    expect(runs).toBe(2);
    expect(results[0]).toBe(1);
    expect(results.slice(1).every((n) => n === 2)).toBe(true);
  });

  it('runs again for a call made after the run finished', async () => {
    const coalesce = createCoalescer();
    let runs = 0;
    const run = () => Promise.resolve(++runs);
    await coalesce(run);
    await coalesce(run);
    expect(runs).toBe(2);
  });
});
