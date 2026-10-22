import { useEffect, useState } from 'react';
import { getRepairs, type RepairListParams } from '../../../lib/api/repairApi';
import { getApiErrorMessage } from '../../../lib/api/errors';
import type { RepairTicket } from '../../../types';

type Loaded =
  | { key: string; status: 'ready'; rows: RepairTicket[]; total: number; fetchedAt: number }
  | { key: string; status: 'error'; message: string };

/**
 * One page of open tickets. When the tab becomes visible again it refetches the same page
 * in the background: the rows stay on screen, and a failed refetch changes nothing (AC-10).
 */
export function useRepairList(params: RepairListParams) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  // A string, so a new params object with the same values never refetches.
  const paramsJson = JSON.stringify(params);
  const key = `${attempt}:${paramsJson}`;

  useEffect(() => {
    const key = `${attempt}:${paramsJson}`;
    let cancelled = false;
    const load = (background: boolean) =>
      getRepairs(JSON.parse(paramsJson) as RepairListParams)
        .then(({ data, total }) => {
          if (!cancelled) setLoaded({ key, status: 'ready', rows: data, total, fetchedAt: Date.now() });
        })
        .catch((err) => {
          if (cancelled || background) return;
          setLoaded({ key, status: 'error', message: getApiErrorMessage(err, 'Repair tickets didn’t load.') });
        });
    const onVisibility = () => {
      if (!document.hidden) void load(true);
    };

    void load(false);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [paramsJson, attempt]);

  // Loading until the latest params have answered; derived, so the effect sets no state synchronously.
  const current = loaded?.key === key ? loaded : null;
  const state: 'loading' | 'error' | 'ready' = current ? current.status : 'loading';

  return {
    state,
    rows: current?.status === 'ready' ? current.rows : [],
    total: current?.status === 'ready' ? current.total : 0,
    /** When the shown rows were fetched; due text and the overdue mark are measured against it (AC-11). */
    fetchedAt: current?.status === 'ready' ? current.fetchedAt : 0,
    errorMessage: current?.status === 'error' ? current.message : undefined,
    retry: () => setAttempt((n) => n + 1),
  };
}
