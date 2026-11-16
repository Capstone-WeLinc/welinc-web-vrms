import { describe, expect, it } from 'vitest';
import { onPreloadError, RELOAD_FLAG } from './chunkReload';

// covers: VRMS spec 0025 AC-8

const memory = () => {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
    items,
  };
};

describe('onPreloadError', () => {
  it('reloads once, then lets the second failure through', () => {
    const store = memory();
    expect(onPreloadError(true, store)).toBe('reload');
    expect(store.items.get(RELOAD_FLAG)).toBe('1');
    expect(onPreloadError(true, store)).toBe('let-through');
  });

  it('never reloads while offline', () => {
    const store = memory();
    expect(onPreloadError(false, store)).toBe('let-through');
    expect(store.items.size).toBe(0);
  });

  it('lets the error through when storage is blocked', () => {
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    expect(onPreloadError(true, blocked)).toBe('let-through');
    expect(onPreloadError(true, undefined)).toBe('let-through');
  });
});
