import { useEffect, useState } from 'react';
import { useVisiblePoll } from '../../../hooks/useVisiblePoll';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { getReferrals, type ReferralList, type ReferralStatus } from '../../../lib/api/referralsApi';

type Loaded =
  | { key: string; status: 'ready'; list: ReferralList }
  | { key: string; status: 'error'; message: string };

/**
 * Spec 0029, AC-7: VMMS referrals in one status, newest first, with the waiting count. While the
 * tab shows, it refetches in the background like the ticket list (spec 0019, AC-21). `enabled`
 * false loads nothing (a caller without `integration.respond`).
 */
export function useReferrals(status: ReferralStatus, enabled: boolean) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const key = `${attempt}:${status}`;

  useEffect(() => {
    if (!enabled) return;
    const key = `${attempt}:${status}`;
    let cancelled = false;
    getReferrals({ status, limit: 100 })
      .then((list) => {
        if (!cancelled) setLoaded({ key, status: 'ready', list });
      })
      .catch((err) => {
        if (!cancelled) setLoaded({ key, status: 'error', message: getApiErrorMessage(err, 'Referrals didn’t load.') });
      });
    return () => {
      cancelled = true;
    };
  }, [status, attempt, enabled]);

  const current = loaded?.key === key ? loaded : null;
  const state: 'loading' | 'error' | 'ready' = current ? current.status : 'loading';

  useVisiblePoll(
    () =>
      getReferrals({ status, limit: 100 }, { quiet: true }).then((list) =>
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
    waitingCount: current?.status === 'ready' ? current.list.waitingCount : null,
    errorMessage: current?.status === 'error' ? current.message : undefined,
    retry: () => setAttempt((n) => n + 1),
  };
}
