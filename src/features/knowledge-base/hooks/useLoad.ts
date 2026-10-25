import { useEffect, useState } from 'react';
import { getApiErrorMessage, getApiErrorStatus } from '../../../lib/api/errors';

type Loaded<T> =
  | { key: string; status: 'ready'; data: T }
  | { key: string; status: 'error'; message: string; code?: number };

/**
 * Loads `fetch(key)` whenever `key` changes (or on retry). State is derived from whether the latest
 * key has answered, so the effect sets no state synchronously (React Compiler rule). A null key loads nothing.
 * Pass a module level `fetch` that reads everything it needs from the key, so it never changes.
 */
export function useLoad<T>(key: string | null, fetch: (key: string) => Promise<T>, fallbackMessage: string) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const fullKey = key == null ? null : `${attempt}:${key}`;

  useEffect(() => {
    if (key == null) return;
    const current = `${attempt}:${key}`;
    let cancelled = false;
    fetch(key)
      .then((data) => {
        if (!cancelled) setLoaded({ key: current, status: 'ready', data });
      })
      .catch((err) => {
        if (!cancelled) {
          setLoaded({ key: current, status: 'error', message: getApiErrorMessage(err, fallbackMessage), code: getApiErrorStatus(err) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key, attempt, fetch, fallbackMessage]);

  const current = fullKey != null && loaded?.key === fullKey ? loaded : null;
  return {
    state: (current ? current.status : 'loading') as 'loading' | 'error' | 'ready',
    data: current?.status === 'ready' ? current.data : null,
    errorMessage: current?.status === 'error' ? current.message : undefined,
    errorCode: current?.status === 'error' ? current.code : undefined,
    retry: () => setAttempt((n) => n + 1),
    /** Refetches in the background: what is shown stays until the fresh copy arrives; a failure changes nothing. */
    refresh: () => {
      if (key == null || fullKey == null) return Promise.resolve();
      return fetch(key)
        .then((data) => setLoaded((prev) => (prev?.key === fullKey ? { key: fullKey, status: 'ready', data } : prev)))
        .catch(() => {});
    },
    /** Swap in a fresh copy after a write, without a refetch. */
    replace: (data: T) => fullKey != null && setLoaded({ key: fullKey, status: 'ready', data }),
  };
}
