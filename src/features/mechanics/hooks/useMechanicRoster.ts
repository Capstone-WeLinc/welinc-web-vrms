import { useEffect, useState } from 'react';
import { useVisiblePoll } from '../../../hooks/useVisiblePoll';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { getMechanicRoster, type MechanicRosterRow } from '../../../lib/api/vrmsConfigApi';

type Loaded = { attempt: number; status: 'ready'; rows: MechanicRosterRow[] } | { attempt: number; status: 'error'; message: string };

/**
 * The Mechanics screen's roster (spec 0022, AC-2 and AC-9). Refetches every 3 seconds while the
 * tab is visible. A failed first load is the error state; a failed refresh keeps the rows and
 * sets `refreshFailed` until the next one lands.
 */
export function useMechanicRoster() {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [refreshFailed, setRefreshFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMechanicRoster().then(
      (rows) => {
        if (!cancelled) setLoaded({ attempt, status: 'ready', rows });
      },
      (err: unknown) => {
        if (!cancelled) setLoaded({ attempt, status: 'error', message: getApiErrorMessage(err, 'Couldn’t load the mechanics.') });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const current = loaded?.attempt === attempt ? loaded : null;
  const state = current ? current.status : ('loading' as const);

  useVisiblePoll(
    () =>
      getMechanicRoster({ quiet: true }).then(
        (rows) => {
          // Unchanged rows keep the same state, so the list does not redraw every few seconds
          setLoaded((prev) =>
            prev?.status === 'ready' && JSON.stringify(prev.rows) === JSON.stringify(rows) ? prev : { attempt, status: 'ready', rows },
          );
          setRefreshFailed(false);
        },
        (err: unknown) => {
          setRefreshFailed(true);
          throw err;
        },
      ),
    state === 'ready',
  );

  return {
    state,
    rows: current?.status === 'ready' ? current.rows : [],
    errorMessage: current?.status === 'error' ? current.message : undefined,
    refreshFailed: state === 'ready' && refreshFailed,
    retry: () => {
      setRefreshFailed(false);
      setAttempt((n) => n + 1);
    },
  };
}
