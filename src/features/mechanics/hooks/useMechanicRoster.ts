import { useEffect, useState } from 'react';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { getMechanicRoster, type MechanicRosterRow } from '../../../lib/api/vrmsConfigApi';

type Loaded = { attempt: number; status: 'ready'; rows: MechanicRosterRow[] } | { attempt: number; status: 'error'; message: string };

/** The Mechanics screen's roster (spec 0022, AC-2). */
export function useMechanicRoster() {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

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
  return {
    state: current ? current.status : ('loading' as const),
    rows: current?.status === 'ready' ? current.rows : [],
    errorMessage: current?.status === 'error' ? current.message : undefined,
    retry: () => setAttempt((n) => n + 1),
  };
}
