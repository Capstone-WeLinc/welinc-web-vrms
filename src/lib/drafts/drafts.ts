/*
  Suite spec 0016, Saving and drafts: unsaved changes to a screen are kept in localStorage under
  `welinc:draft:<user id>:<screen id>`, with the time and each change's "from" value, for 7 days.
  Signing out clears all of that user's drafts.
*/

export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PREFIX = 'welinc:draft:';

/** One stored change: the item it touches, the server value it started from, and the draft value. */
export type DraftChange<T = unknown> = { key: string; from: T; to: T };

export type StoredDraft<T = unknown> = { savedAt: number; changes: DraftChange<T>[] };

export function draftKey(userId: string, screenId: string) {
  return `${PREFIX}${userId}:${screenId}`;
}

export function writeDraft<T>(userId: string, screenId: string, changes: DraftChange<T>[], now = Date.now()) {
  try {
    if (changes.length === 0) localStorage.removeItem(draftKey(userId, screenId));
    else localStorage.setItem(draftKey(userId, screenId), JSON.stringify({ savedAt: now, changes }));
  } catch {
    // Storage full or blocked (private mode): the draft just isn't kept.
  }
}

export function clearDraft(userId: string, screenId: string) {
  writeDraft(userId, screenId, []);
}

/** The stored draft, or null when there is none, it can't be read, or it is older than 7 days. */
export function readDraft<T>(userId: string, screenId: string, now = Date.now()): StoredDraft<T> | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(draftKey(userId, screenId));
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as StoredDraft<T>;
    const valid = typeof draft.savedAt === 'number' && Array.isArray(draft.changes) && draft.changes.length > 0;
    if (valid && now - draft.savedAt <= DRAFT_TTL_MS) return draft;
  } catch {
    // Unreadable: dropped below.
  }
  clearDraft(userId, screenId);
  return null;
}

/** True when every stored "from" still equals what the server has now. */
export function draftStillFits<T>(draft: StoredDraft<T>, current: (key: string) => T | undefined) {
  return draft.changes.every((change) => JSON.stringify(current(change.key)) === JSON.stringify(change.from));
}

/** Drops every draft of this user, on sign out. */
export function clearUserDrafts(userId: string) {
  try {
    const mine = `${PREFIX}${userId}:`;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(mine)) keys.push(key);
    }
    for (const key of keys) localStorage.removeItem(key);
  } catch {
    // Storage blocked: nothing was kept.
  }
}
