import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../../../context/toast';
import { getUsers } from '../../../lib/api/authApi';
import { getApiErrorMessage } from '../../../lib/api/errors';
import type { ManagedUser } from '../../../types';

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; users: ManagedUser[] };

/** first: shows its failure in place of the list. background: keeps the rows, toasts once per run of failures. quiet: keeps the rows, says nothing. */
type LoadMode = 'first' | 'background' | 'quiet';

/**
 * Every VRMS user (spec 0006, AC-8). Refetches quietly when the tab becomes visible again.
 * Each request is numbered and only the latest may land, and `runWrite` pauses background
 * refetches and drops any already in flight, so a refetch never overwrites a row an action
 * just replaced. `onRefresh` hears every list that lands after the first.
 */
export function useUsers(onRefresh?: (users: ManagedUser[]) => void) {
  const { showToast } = useToast();
  const [state, setState] = useState<ListState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(0);
  const writes = useRef(0);
  const hasRows = useRef(false);
  const refreshFailed = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  });

  // Lands one numbered result; anything older than the latest request is dropped.
  const land = useCallback(
    (id: number, mode: LoadMode, result: { users: ManagedUser[] } | { err: unknown }): ManagedUser[] | null => {
      if (id !== latest.current) return null;
      if ('users' in result) {
        const first = !hasRows.current;
        hasRows.current = true;
        refreshFailed.current = false;
        setState({ status: 'ready', users: result.users });
        if (!first) onRefreshRef.current?.(result.users);
        return result.users;
      }
      if (!hasRows.current) {
        setState({ status: 'error', message: getApiErrorMessage(result.err, 'Couldn’t load users.') });
      } else if (mode === 'background' && !refreshFailed.current) {
        refreshFailed.current = true;
        showToast('Couldn’t refresh users.', 'error');
      }
      return null;
    },
    [showToast],
  );

  const load = useCallback(
    (mode: LoadMode) => {
      const id = ++latest.current;
      return getUsers('VRMS').then(
        (users) => land(id, mode, { users }),
        (err: unknown) => land(id, mode, { err }),
      );
    },
    [land],
  );

  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden && writes.current === 0) void load('background');
    };
    void load('first');
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      // Drops whatever is still in flight.
      latest.current += 1;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [load, attempt]);

  const retry = () => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  };

  /** Runs a row action or a save. While it runs, no list result may land. */
  const runWrite = useCallback(async <T,>(write: () => Promise<T>): Promise<T> => {
    writes.current += 1;
    latest.current += 1;
    try {
      return await write();
    } finally {
      writes.current -= 1;
    }
  }, []);

  /** Puts the server's copy of a user in the list: replaces it, or adds it when new. */
  const upsertUser = useCallback((user: ManagedUser) => {
    setState((current) => {
      if (current.status !== 'ready') return current;
      const exists = current.users.some((item) => item.id === user.id);
      const users = exists ? current.users.map((item) => (item.id === user.id ? user : item)) : [...current.users, user];
      return { status: 'ready', users };
    });
  }, []);

  return {
    status: state.status,
    users: state.status === 'ready' ? state.users : [],
    errorMessage: state.status === 'error' ? state.message : undefined,
    retry,
    /** Refetches now, keeping the rows on failure; resolves the new list, or null when it failed or was overtaken. */
    refetch: useCallback(() => load('quiet'), [load]),
    runWrite,
    upsertUser,
  };
}
