import { useEffect, useState } from 'react';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { getReferral, type ReferralDetail } from '../../../lib/api/referralsApi';

type Loaded =
  | { key: string; state: 'ready'; referral: ReferralDetail }
  | { key: string; state: 'error'; message: string };

export type ReferralState =
  | { state: 'none' }
  | { state: 'loading' }
  | { state: 'ready'; referral: ReferralDetail }
  | { state: 'error'; message: string; retry: () => void };

/** Spec 0029, AC-7 and AC-8: one VMMS referral, or `none` when no id is given. */
export function useReferral(id: string | null): ReferralState {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const key = `${attempt}:${id ?? ''}`;

  useEffect(() => {
    if (!id) return;
    const key = `${attempt}:${id}`;
    let cancelled = false;
    getReferral(id)
      .then((referral) => {
        if (!cancelled) setLoaded({ key, state: 'ready', referral });
      })
      .catch((err) => {
        if (!cancelled) setLoaded({ key, state: 'error', message: getApiErrorMessage(err, 'This referral didn’t load.') });
      });
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  if (!id) return { state: 'none' };
  const current = loaded?.key === key ? loaded : null;
  if (!current) return { state: 'loading' };
  if (current.state === 'error') return { state: 'error', message: current.message, retry: () => setAttempt((n) => n + 1) };
  return { state: 'ready', referral: current.referral };
}
