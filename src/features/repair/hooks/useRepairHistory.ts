import { useEffect, useState } from 'react';
import { getRepairHistory, type RepairHistoryParams, type RepairHistoryResponse } from '../../../lib/api/repairApi';
import { getApiErrorMessage } from '../../../lib/api/errors';

type Loaded =
  | { key: string; status: 'ready'; response: RepairHistoryResponse }
  | { key: string; status: 'error'; message: string };

/**
 * Loads one page of history with its summary. `params` null means "don't send" (an
 * unfinished Custom range): the last result stays on screen and nothing is fetched.
 */
export function useRepairHistory(params: RepairHistoryParams | null) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  // A string, so a new params object with the same values never refetches.
  const paramsJson = params ? JSON.stringify(params) : null;
  const key = paramsJson === null ? null : `${attempt}:${paramsJson}`;

  useEffect(() => {
    if (paramsJson === null) return;
    const key = `${attempt}:${paramsJson}`;
    let cancelled = false;
    getRepairHistory(JSON.parse(paramsJson) as RepairHistoryParams)
      .then((response) => {
        if (!cancelled) setLoaded({ key, status: 'ready', response });
      })
      .catch((err) => {
        if (!cancelled) setLoaded({ key, status: 'error', message: getApiErrorMessage(err, 'Repair history didn’t load.') });
      });
    return () => {
      cancelled = true;
    };
  }, [paramsJson, attempt]);

  // Loading whenever the latest request hasn't answered yet; derived, so no setState in the effect.
  const state: 'loading' | 'error' | 'ready' =
    key !== null && loaded?.key !== key ? 'loading' : loaded?.status === 'error' ? 'error' : loaded ? 'ready' : 'loading';

  return {
    state,
    rows: loaded?.status === 'ready' ? loaded.response.data : [],
    total: loaded?.status === 'ready' ? loaded.response.total : 0,
    summary: loaded?.status === 'ready' ? loaded.response.summary : null,
    verifiers: loaded?.status === 'ready' ? loaded.response.verifiers : [],
    errorMessage: loaded?.status === 'error' ? loaded.message : undefined,
    retry: () => setAttempt((n) => n + 1),
  };
}
