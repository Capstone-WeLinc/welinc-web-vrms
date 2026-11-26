import { describe, expect, it } from 'vitest';
import { tileGridClass } from './tileGrid';

describe('tileGridClass', () => {
  it('never leaves one tile alone on a wide row', () => {
    expect(tileGridClass(4)).toContain('lg:grid-cols-4');
    expect(tileGridClass(5)).toContain('lg:grid-cols-5');
    expect(tileGridClass(6)).toContain('lg:grid-cols-3');
    expect(tileGridClass(7)).toContain('lg:grid-cols-4');
  });
});
