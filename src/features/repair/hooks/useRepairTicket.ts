import { useEffect, useState } from 'react';
import { useVisiblePoll } from '../../../hooks/useVisiblePoll';
import { getRepair } from '../../../lib/api/repairApi';
import { getApiErrorMessage, getApiErrorStatus } from '../../../lib/api/errors';
import { isNewer } from '../../../lib/visiblePoll';
import type { RepairTicket } from '../../../types';

type Loaded =
  | { key: string; status: 'ready'; ticket: RepairTicket; loadedAt: number }
  | { key: string; status: 'error'; code: number | undefined; message: string };

interface Options {
  /** Holds the background refetch, such as while a status dialog keyed on the ticket is open. */
  paused?: boolean;
  /** Spec 0019, AC-23: a background refetch answered 403 (no longer assigned) or 404 (gone). */
  onGone?: (code: 403 | 404) => void;
}

/**
 * One repair ticket. `replace` shows a ticket a write returned; `reload` fetches the latest in
 * the background (after a 409), keeping the current ticket on screen if that fails. While shown it
 * refetches every 3 seconds (spec 0019, AC-21); only a newer, changed ticket replaces it.
 */
export function useRepairTicket(id: string, { paused = false, onGone }: Options = {}) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const key = `${attempt}:${id}`;

  useEffect(() => {
    const key = `${attempt}:${id}`;
    let cancelled = false;
    getRepair(id)
      .then((ticket) => {
        if (!cancelled) setLoaded({ key, status: 'ready', ticket, loadedAt: Date.now() });
      })
      .catch((err) => {
        if (cancelled) return;
        setLoaded({
          key,
          status: 'error',
          code: getApiErrorStatus(err),
          message: getApiErrorMessage(err, 'This repair ticket didn’t load.'),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  const current = loaded?.key === key ? loaded : null;

  const replace = (ticket: RepairTicket) =>
    setLoaded((prev) => (prev && prev.key === key ? { key, status: 'ready', ticket, loadedAt: Date.now() } : prev));

  /** A fetched ticket shows only when it is newer and different (an older one lost to a save). */
  const offer = (ticket: RepairTicket) =>
    setLoaded((prev) =>
      prev && prev.key === key && prev.status === 'ready' && isNewer(prev.ticket, ticket)
        ? { key, status: 'ready', ticket, loadedAt: Date.now() }
        : prev,
    );

  const reload = () =>
    getRepair(id)
      .then((ticket) => {
        replace(ticket);
        return ticket;
      })
      .catch(() => null);

  // AC-21 and AC-23: a failed background refetch keeps the ticket on screen; losing access says so
  useVisiblePoll(
    () =>
      getRepair(id, { quiet: true })
        .then(offer)
        .catch((err: unknown) => {
          const code = getApiErrorStatus(err);
          if (code === 403 || code === 404) onGone?.(code);
          throw err;
        }),
    current?.status === 'ready' && !paused,
  );

  return {
    state: (current ? current.status : 'loading') as 'loading' | 'error' | 'ready',
    ticket: current?.status === 'ready' ? current.ticket : null,
    /** When the shown ticket loaded; the due text is measured against it. */
    loadedAt: current?.status === 'ready' ? current.loadedAt : 0,
    errorCode: current?.status === 'error' ? current.code : undefined,
    errorMessage: current?.status === 'error' ? current.message : undefined,
    replace,
    reload,
    retry: () => setAttempt((n) => n + 1),
  };
}
