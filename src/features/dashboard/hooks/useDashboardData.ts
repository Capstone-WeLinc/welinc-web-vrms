import { useEffect, useRef, useState } from 'react';
import type { RepairHistoryRow, RepairTicket } from '../../../types';
import { getRepairHistory, getRepairs } from '../../../lib/api/repairApi';
import { getApiErrorMessage } from '../../../lib/api/errors';

const POLL_MS = 15000;
const ADMIN_LIMIT = 10000;

type Snapshot = {
  active: RepairTicket[];
  history: RepairHistoryRow[];
  totals: { active: number; history: number };
  /** Client clock when this fetch succeeded. Every time based rule is measured against it. */
  fetchedAt: number;
};

async function fetchSnapshot(includeHistory: boolean): Promise<Snapshot> {
  // Admins fetch both lists together, so a half drawn dashboard never looks complete.
  // Mechanics send no page or limit; the backend then returns every assigned active ticket.
  const [active, history] = await Promise.all([
    includeHistory ? getRepairs({ page: 1, limit: ADMIN_LIMIT }) : getRepairs(),
    includeHistory
      ? getRepairHistory({ page: 1, limit: ADMIN_LIMIT })
      : Promise.resolve({ data: [] as RepairHistoryRow[], total: 0 }),
  ]);
  return {
    active: active.data,
    history: history.data,
    totals: { active: active.total, history: history.total },
    fetchedAt: Date.now(),
  };
}

export function useDashboardData({ includeHistory }: { includeHistory: boolean }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    // No polling while the first load error is showing; retry clears it and this runs again.
    if (loadError) return;
    let cancelled = false;
    let inFlight = false;
    let timer: number | undefined;

    const run = () => {
      if (inFlight) return;
      inFlight = true;
      fetchSnapshot(includeHistory)
        .then((next) => {
          if (cancelled) return;
          loaded.current = true;
          setSnapshot(next);
          setRefreshFailed(false);
        })
        .catch((err) => {
          if (cancelled) return;
          // After one success the data stays on screen; only the status line changes.
          if (loaded.current) setRefreshFailed(true);
          else setLoadError(getApiErrorMessage(err, 'The dashboard didn’t load.'));
        })
        .finally(() => {
          inFlight = false;
        });
    };
    const stop = () => {
      window.clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      stop();
      timer = window.setInterval(run, POLL_MS);
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        run();
        start();
      }
    };

    run();
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [includeHistory, loadError]);

  const retry = () => setLoadError(null);

  const state: 'loading' | 'error' | 'ready' = snapshot ? 'ready' : loadError ? 'error' : 'loading';
  const truncated = snapshot
    ? snapshot.totals.active > snapshot.active.length || snapshot.totals.history > snapshot.history.length
    : false;

  return {
    active: snapshot?.active ?? [],
    history: snapshot?.history ?? [],
    totals: snapshot?.totals ?? { active: 0, history: 0 },
    fetchedAt: snapshot?.fetchedAt ?? 0,
    state,
    errorMessage: loadError,
    refreshFailed,
    truncated,
    retry,
  };
}
