import { useEffect, useState } from 'react';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { getDelivery, type DeliveryDetail } from '../../../lib/api/deliveriesApi';

type Loaded = { key: string; state: 'ready'; delivery: DeliveryDetail } | { key: string; state: 'error'; message: string };

export type DeliveryState =
  | { state: 'none' }
  | { state: 'loading' }
  | { state: 'ready'; delivery: DeliveryDetail; replace: (next: DeliveryDetail) => void }
  | { state: 'error'; message: string; retry: () => void };

/** Spec 0029, AC-22: one message for the side sheet, or `none` when no id is given. */
export function useDelivery(id: string | null): DeliveryState {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const key = `${attempt}:${id ?? ''}`;

  useEffect(() => {
    if (!id) return;
    const key = `${attempt}:${id}`;
    let cancelled = false;
    getDelivery(id)
      .then((delivery) => {
        if (!cancelled) setLoaded({ key, state: 'ready', delivery });
      })
      .catch((err) => {
        if (!cancelled) setLoaded({ key, state: 'error', message: getApiErrorMessage(err, 'This message didn’t load.') });
      });
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  if (!id) return { state: 'none' };
  const current = loaded?.key === key ? loaded : null;
  if (!current) return { state: 'loading' };
  if (current.state === 'error') return { state: 'error', message: current.message, retry: () => setAttempt((n) => n + 1) };
  return { state: 'ready', delivery: current.delivery, replace: (next) => setLoaded({ key, state: 'ready', delivery: next }) };
}
