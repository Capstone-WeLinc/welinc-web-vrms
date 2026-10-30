import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./axios', () => ({ default: api }));

import { getSettingChanges } from './settingsApi';

// Spec 0012, AC-31: the keys the Recent changes box asks for

describe('getSettingChanges keys', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.get.mockResolvedValue({ data: { data: [], nextCursor: null } });
  });

  const sent = () => api.get.mock.calls[0][1].params;

  it('sorts the keys, drops duplicates and joins them with commas', async () => {
    await getSettingChanges({ kind: 'setting', limit: 5, keys: ['module.knowledge', 'module.ai', 'module.ai'] });
    expect(api.get.mock.calls[0][0]).toBe('/vrms/settings/changes');
    expect(sent()).toEqual({ kind: 'setting', limit: 5, keys: 'module.ai,module.knowledge' });
  });

  it('sends no keys at all when none are given', async () => {
    await getSettingChanges({ kind: 'all', limit: 20, cursor: 'abc' });
    expect(sent()).toEqual({ kind: 'all', limit: 20, cursor: 'abc' });
    expect('keys' in sent()).toBe(false);
  });

  it('returns the page body', async () => {
    api.get.mockResolvedValue({ data: { data: [{ id: 'x' }], nextCursor: 'n' } });
    expect(await getSettingChanges({ keys: ['a'] })).toEqual({ data: [{ id: 'x' }], nextCursor: 'n' });
  });
});
