import { useCallback, useEffect, useRef, useState } from 'react';
import { showToast } from '../context/toast';
import {
  clearDraft,
  draftStillFits,
  readDraft,
  writeDraft,
  type DraftChange,
  type StoredDraft,
} from '../lib/drafts/drafts';
import { useAuthStore } from '../store/authStore';

interface DraftOptions<T> {
  /** Names the screen in the storage key, such as `settings:thresholds`. */
  screenId: string;
  /** Names what is edited in the toasts ("Your 2 changes to Thresholds are kept…"). */
  name: string;
  /** The caller's change list, as it is now. */
  changes: DraftChange<T>[];
  /** True once the server values are loaded, so a stored draft can be checked against them. */
  ready: boolean;
  /** The server's value for a change's key now. */
  current: (key: string) => T | undefined;
  /** Puts the stored changes back into the caller's state. */
  onRestore: (changes: DraftChange<T>[]) => void;
}

const plural = (count: number) => `${count} ${count === 1 ? 'change' : 'changes'}`;

/**
 * Suite spec 0016, Saving and drafts: keeps a SaveBar screen's unsaved changes while you are away.
 * Every change is written to localStorage as it happens (so a reload keeps it too); leaving the
 * page says so in a toast; coming back restores the draft, unless any stored "from" no longer
 * matches the server, which drops the whole draft. Closing or reloading the tab with changes gets
 * the browser's own prompt. Call `clear` after Discard and after a successful save.
 */
export function useDraft<T>({ screenId, name, changes, ready, current, onRestore }: DraftOptions<T>) {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const [keptAt, setKeptAt] = useState<number | null>(null);
  // Until the stored draft has been checked, an empty change list must not overwrite it.
  const [checked, setChecked] = useState(false);

  const latest = useRef({ changes, name, current, onRestore });
  useEffect(() => {
    latest.current = { changes, name, current, onRestore };
  });

  const restore = useCallback(
    (draft: StoredDraft<T> | null, uid: string) => {
      setChecked(true);
      if (!draft) return;
      const { current: now, onRestore: apply, name: label } = latest.current;
      if (!draftStillFits(draft, now)) {
        clearDraft(uid, screenId);
        showToast(`Your kept changes to ${label} were dropped`, 'info', {
          body: 'Someone saved it since you left, so nothing of yours was applied.',
        });
        return;
      }
      setKeptAt(draft.savedAt);
      apply(draft.changes);
    },
    [screenId],
  );

  useEffect(() => {
    if (!ready || !userId || checked) return;
    // A tick later, so the restore lands as its own update after the page's first render.
    const timer = setTimeout(() => restore(readDraft<T>(userId, screenId), userId), 0);
    return () => clearTimeout(timer);
  }, [ready, userId, checked, screenId, restore]);

  useEffect(() => {
    if (!checked || !userId) return;
    writeDraft(userId, screenId, changes);
  }, [checked, userId, screenId, changes]);

  // Leaving the page in the app keeps the draft and says so.
  useEffect(
    () => () => {
      const count = latest.current.changes.length;
      if (count > 0) showToast(`Your ${plural(count)} to ${latest.current.name} are kept for when you come back`, 'info');
    },
    [],
  );

  const dirty = changes.length > 0;
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older browsers still need returnValue set to show the prompt.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const clear = useCallback(() => {
    setKeptAt(null);
    if (userId) clearDraft(userId, screenId);
  }, [userId, screenId]);

  return { keptAt: dirty ? keptAt : null, clear };
}
