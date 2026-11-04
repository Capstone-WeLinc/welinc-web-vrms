import { useEffect, useState } from 'react';
import { useVisiblePoll } from '../../../hooks/useVisiblePoll';
import type { RepairHistoryRow, RepairTicket } from '../../../types';
import { getRepairHistory, getRepairs } from '../../../lib/api/repairApi';
import { getApiErrorMessage } from '../../../lib/api/errors';

const ADMIN_LIMIT = 10000;

type Snapshot = {
  active: RepairTicket[];
  history: RepairHistoryRow[];
  totals: { active: number; history: number };
  /** Client clock when this fetch succeeded. Every time based rule is measured against it. */
  fetchedAt: number;
};

/** `quiet` for the background refetch, which reports a failure in the status line instead of a toast. */
async function fetchSnapshot(includeHistory: boolean, quiet = false): Promise<Snapshot> {
  // Admins fetch both lists together, so a half drawn dashboard never looks complete.
  // Mechanics send no page or limit; the backend then returns every assigned active ticket.
  const [active, history] = await Promise.all([
    includeHistory ? getRepairs({ page: 1, limit: ADMIN_LIMIT }, { quiet }) : getRepairs({}, { quiet }),
    includeHistory
      ? getRepairHistory({ page: 1, limit: ADMIN_LIMIT }, { quiet })
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

  // The first load; retry clears the error and this runs again
  useEffect(() => {
    if (loadError) return;
    let cancelled = false;
    fetchSnapshot(includeHistory)
      .then((next) => {
        if (cancelled) return;
        setSnapshot(next);
        setRefreshFailed(false);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getApiErrorMessage(err, 'The dashboard didn’t load.'));
      });
    return () => {
      cancelled = true;
    };
  }, [includeHistory, loadError]);

  // Spec 0019, AC-21: every 3 seconds while visible (was 15). After one success the data stays on
  // screen; a failed refetch only changes the status line.
  const refetch = () =>
    fetchSnapshot(includeHistory, true).then(
      (next) => {
        setSnapshot(next);
        setRefreshFailed(false);
      },
      (err: unknown) => {
        setRefreshFailed(true);
        throw err;
      },
    );
  useVisiblePoll(refetch, snapshot !== null && !loadError);

  const retry = () => setLoadError(null);
  /** Spec 0022, AC-14: refetch now, quietly, after a change elsewhere on the page. */
  const refresh = () => {
    refetch().catch(() => undefined);
  };

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
    refresh,
  };
}
