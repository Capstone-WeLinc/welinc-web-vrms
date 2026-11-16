// VRMS spec 0025, AC-8: after a deploy an open tab may ask for a lazy file that no longer exists.
// The page reloads once by itself and nothing is reported. A second failure in the same tab, or
// any failure while offline, falls through to the crash screen (and is reported when online).

export const RELOAD_FLAG = 'chunk-reload';
/** The flag clears this long after a page load that worked, so a later deploy can reload again. */
export const CLEAR_AFTER_MS = 10_000;

type FlagStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function read(store: FlagStore | undefined): string | null | 'blocked' {
  try {
    return store ? store.getItem(RELOAD_FLAG) : 'blocked';
  } catch {
    return 'blocked';
  }
}

/** What to do with one failed lazy load: reload once, or let the error through. */
export function onPreloadError(online: boolean, store: FlagStore | undefined): 'reload' | 'let-through' {
  if (!online) return 'let-through';
  const flag = read(store);
  // Storage blocked: no automatic reload, never a crash
  if (flag !== null) return 'let-through';
  try {
    store!.setItem(RELOAD_FLAG, '1');
  } catch {
    return 'let-through';
  }
  return 'reload';
}

function sessionStore(): FlagStore | undefined {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

/** Installs the listener; called once from main.tsx. */
export function installChunkReload(): void {
  window.addEventListener('vite:preloadError', (event) => {
    if (onPreloadError(navigator.onLine, sessionStore()) === 'reload') {
      event.preventDefault();
      window.location.reload();
    }
  });
  window.addEventListener('load', () => {
    setTimeout(() => {
      try {
        sessionStore()?.removeItem(RELOAD_FLAG);
      } catch {
        // Blocked storage: nothing to clear
      }
    }, CLEAR_AFTER_MS);
  });
}
