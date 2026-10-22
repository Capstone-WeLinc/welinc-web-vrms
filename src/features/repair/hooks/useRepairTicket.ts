import { useEffect, useState } from 'react';
import { getRepair } from '../../../lib/api/repairApi';
import { getApiErrorMessage, getApiErrorStatus } from '../../../lib/api/errors';
import type { RepairTicket } from '../../../types';

type Loaded =
  | { key: string; status: 'ready'; ticket: RepairTicket; loadedAt: number }
  | { key: string; status: 'error'; code: number | undefined; message: string };

/**
 * One repair ticket. `replace` shows a ticket a write returned; `reload` fetches the latest in
 * the background (after a 409), keeping the current ticket on screen if that fails.
 */
export function useRepairTicket(id: string) {
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

  const reload = () =>
    getRepair(id)
      .then((ticket) => {
        replace(ticket);
        return ticket;
      })
      .catch(() => null);

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
