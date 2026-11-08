import { useEffect, useState } from 'react';
import { getApiErrorMessage } from '../../../lib/api/errors';
import type { SessionView } from '../../../lib/api/sessionsApi';

export type SessionListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; sessions: SessionView[] };

/**
 * Loads a sessions list with `load` while `enabled`, and again on `reload()`. `remove` drops a
 * row at once after it was ended, before the next load.
 */
export function useSessionList(load: () => Promise<SessionView[]>, key: string, enabled = true) {
  const [state, setState] = useState<SessionListState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    load()
      .then((sessions) => {
        if (!cancelled) setState({ status: 'ready', sessions });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', message: getApiErrorMessage(err, 'The sessions didn’t load.') });
      });
    return () => {
      cancelled = true;
    };
    // `load` is a new function each render; `key` names what it loads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt, enabled]);

  const reload = () => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  };

  const remove = (sids: string[]) =>
    setState((current) =>
      current.status === 'ready' ? { status: 'ready', sessions: current.sessions.filter((s) => !sids.includes(s.sid)) } : current,
    );

  return { state, reload, remove };
}
