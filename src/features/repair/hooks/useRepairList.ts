import { useEffect, useState } from 'react';
import { useVisiblePoll } from '../../../hooks/useVisiblePoll';
import { getRepairs, type RepairListParams } from '../../../lib/api/repairApi';
import { getApiErrorMessage } from '../../../lib/api/errors';
import type { RepairTicket } from '../../../types';

type Loaded =
  | { key: string; status: 'ready'; rows: RepairTicket[]; total: number; fetchedAt: number }
  | { key: string; status: 'error'; message: string };

/**
 * One page of open tickets. While the tab is visible it refetches the same page every 3 seconds
 * in the background (spec 0019, AC-21): the rows stay on screen, and a failed refetch changes
 * nothing (AC-10).
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
    getRepairs(JSON.parse(paramsJson) as RepairListParams)
      .then(({ data, total }) => {
        if (!cancelled) setLoaded({ key, status: 'ready', rows: data, total, fetchedAt: Date.now() });
      })
      .catch((err) => {
        if (!cancelled) setLoaded({ key, status: 'error', message: getApiErrorMessage(err, 'Repair tickets didn’t load.') });
      });
    return () => {
      cancelled = true;
    };
  }, [paramsJson, attempt]);

  // Loading until the latest params have answered; derived, so the effect sets no state synchronously.
  const current = loaded?.key === key ? loaded : null;
  const state: 'loading' | 'error' | 'ready' = current ? current.status : 'loading';

  // A refetch for params the user has since changed is dropped, never shown over the new page
  useVisiblePoll(
    () =>
      getRepairs(JSON.parse(paramsJson) as RepairListParams, { quiet: true }).then(({ data, total }) =>
        setLoaded((prev) => {
          if (prev?.key !== key) return prev;
          // Unchanged rows keep the same state, so the table does not redraw every few seconds
          if (prev.status === 'ready' && prev.total === total && JSON.stringify(prev.rows) === JSON.stringify(data)) return prev;
          return { key, status: 'ready', rows: data, total, fetchedAt: Date.now() };
        }),
      ),
    state === 'ready',
  );

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
