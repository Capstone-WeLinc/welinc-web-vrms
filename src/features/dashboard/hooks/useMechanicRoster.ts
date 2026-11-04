import { useEffect, useState } from 'react';
import { useVisiblePoll } from '../../../hooks/useVisiblePoll';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { getMechanicRoster, type MechanicRosterRow } from '../../../lib/api/vrmsConfigApi';

type Loaded = { attempt: number; status: 'ready'; rows: MechanicRosterRow[] } | { attempt: number; status: 'error'; message: string };

/**
 * The Team section's roster (spec 0022, AC-2 and AC-15). Refetches every 3 seconds while the
 * tab is visible, on its own so a roster failure never blanks the rest of the dashboard. A failed
 * first load is the error state; a failed refresh keeps the rows and sets `refreshFailed` until
 * the next one lands.
 */
/** `enabled` false skips every read, for a viewer without mechanics.view. */
export function useMechanicRoster(enabled = true) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [refreshFailed, setRefreshFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getMechanicRoster().then(
      (rows) => {
        if (!cancelled) setLoaded({ attempt, status: 'ready', rows });
      },
      (err: unknown) => {
        if (!cancelled) setLoaded({ attempt, status: 'error', message: getApiErrorMessage(err, 'Couldn’t load the team.') });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt, enabled]);

  const current = loaded?.attempt === attempt ? loaded : null;
  const state = current ? current.status : ('loading' as const);

  const refetch = () =>
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
    );
  useVisiblePoll(refetch, enabled && state === 'ready');

  return {
    state,
    rows: current?.status === 'ready' ? current.rows : [],
    errorMessage: current?.status === 'error' ? current.message : undefined,
    refreshFailed: state === 'ready' && refreshFailed,
    /** Spec 0022, AC-14: refetch now, quietly, after a Reassign or Unassign. */
    refresh: () => {
      if (state === 'ready') refetch().catch(() => undefined);
    },
    retry: () => {
      setRefreshFailed(false);
      setAttempt((n) => n + 1);
    },
  };
}
