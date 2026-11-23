import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearUserDrafts, DRAFT_TTL_MS, draftKey, draftStillFits, readDraft, writeDraft, type StoredDraft } from './drafts';

// The tests run in node: a small in memory Storage stands in for the browser's.
function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  };
}

describe('drafts (suite spec 0016, Saving and drafts)', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()));

  it('keeps changes under welinc:draft:<user id>:<screen id> with the time', () => {
    writeDraft('u1', 'settings:thresholds', [{ key: 'a', from: 1, to: 2 }], 1000);
    expect(JSON.parse(localStorage.getItem('welinc:draft:u1:settings:thresholds') ?? '')).toEqual({
      savedAt: 1000,
      changes: [{ key: 'a', from: 1, to: 2 }],
    });
    expect(readDraft('u1', 'settings:thresholds', 2000)?.changes).toHaveLength(1);
  });

  it('removes the draft when the change list is empty', () => {
    writeDraft('u1', 's', [{ key: 'a', from: 1, to: 2 }]);
    writeDraft('u1', 's', []);
    expect(localStorage.getItem(draftKey('u1', 's'))).toBeNull();
  });

  it('drops a draft older than 7 days', () => {
    writeDraft('u1', 's', [{ key: 'a', from: 1, to: 2 }], 0);
    expect(readDraft('u1', 's', DRAFT_TTL_MS)).not.toBeNull();
    expect(readDraft('u1', 's', DRAFT_TTL_MS + 1)).toBeNull();
    expect(localStorage.getItem(draftKey('u1', 's'))).toBeNull();
  });

  it('drops an unreadable draft', () => {
    localStorage.setItem(draftKey('u1', 's'), '{not json');
    expect(readDraft('u1', 's')).toBeNull();
    expect(localStorage.getItem(draftKey('u1', 's'))).toBeNull();
  });

  it('fits only while every stored "from" still matches the server', () => {
    const draft: StoredDraft = { savedAt: 0, changes: [{ key: 'a', from: { on: true }, to: { on: false } }, { key: 'b', from: 3, to: 4 }] };
    expect(draftStillFits(draft, (key) => (key === 'a' ? { on: true } : 3))).toBe(true);
    expect(draftStillFits(draft, (key) => (key === 'a' ? { on: true } : 5))).toBe(false);
  });

  it('clears only the signed out user’s drafts', () => {
    writeDraft('u1', 'x', [{ key: 'a', from: 1, to: 2 }]);
    writeDraft('u1', 'y', [{ key: 'a', from: 1, to: 2 }]);
    writeDraft('u2', 'x', [{ key: 'a', from: 1, to: 2 }]);
    localStorage.setItem('welinc:sidebar:u1', 'collapsed');
    clearUserDrafts('u1');
    expect(localStorage.getItem(draftKey('u1', 'x'))).toBeNull();
    expect(localStorage.getItem(draftKey('u1', 'y'))).toBeNull();
    expect(localStorage.getItem(draftKey('u2', 'x'))).not.toBeNull();
    expect(localStorage.getItem('welinc:sidebar:u1')).toBe('collapsed');
  });
});
