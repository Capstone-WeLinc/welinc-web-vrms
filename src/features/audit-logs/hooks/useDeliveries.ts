import { useEffect, useState } from 'react';
import { useVisiblePoll } from '../../../hooks/useVisiblePoll';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { getDeliveries, type DeliveryFilters, type DeliveryList } from '../../../lib/api/deliveriesApi';

type Loaded = { key: string; status: 'ready'; list: DeliveryList } | { key: string; status: 'error'; message: string };

/** The newest 100 that match: failed rows first, then the rest, newest first. */
const LIMIT = 100;

/**
 * Spec 0029, AC-22: messages to VMMS and BMS, refetched in the background while the page shows
 * (the worker sends every 15 s). With `enabled` false it loads only once, for the tab's count.
 */
export function useDeliveries(filters: DeliveryFilters, enabled: boolean) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const key = `${attempt}:${filters.status ?? ''}:${filters.target ?? ''}:${filters.kind ?? ''}`;

  useEffect(() => {
    let cancelled = false;
    getDeliveries({ ...filters, limit: LIMIT })
      .then((list) => {
        if (!cancelled) setLoaded({ key, status: 'ready', list });
      })
      .catch((err) => {
        if (!cancelled) setLoaded({ key, status: 'error', message: getApiErrorMessage(err, 'Deliveries didn’t load.') });
      });
    return () => {
      cancelled = true;
    };
    // key carries the filters and the retry count
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = loaded?.key === key ? loaded : null;
  const state: 'loading' | 'error' | 'ready' = current ? current.status : 'loading';

  useVisiblePoll(
    () =>
      getDeliveries({ ...filters, limit: LIMIT }, { quiet: true }).then((list) =>
        setLoaded((prev) => {
          if (prev?.key !== key) return prev;
          if (prev.status === 'ready' && JSON.stringify(prev.list) === JSON.stringify(list)) return prev;
          return { key, status: 'ready', list };
        }),
      ),
    enabled && state === 'ready',
  );

  return {
    state,
    rows: current?.status === 'ready' ? current.list.items : [],
    failedCount: current?.status === 'ready' ? current.list.failedCount : null,
    errorMessage: current?.status === 'error' ? current.message : undefined,
    retry: () => setAttempt((n) => n + 1),
  };
}
