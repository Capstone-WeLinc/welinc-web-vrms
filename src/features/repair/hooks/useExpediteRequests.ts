import { useEffect, useState } from 'react';
import { useVisiblePoll } from '../../../hooks/useVisiblePoll';
import { getExpediteRequests, type ExpediteRequestList } from '../../../lib/api/expediteApi';

/**
 * Spec 0029 (child 0003), AC-18: every waiting BMS expedite request, for the Admin dashboard,
 * kept live like the referrals tile. `enabled` false loads nothing (no `integration.respond`).
 */
export function useExpediteRequests(enabled: boolean) {
  const [list, setList] = useState<ExpediteRequestList | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getExpediteRequests({ quiet: true })
      .then((next) => {
        if (!cancelled) setList(next);
      })
      .catch(() => {
        // The tile and list stay hidden; the next refresh tries again
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useVisiblePoll(
    () =>
      getExpediteRequests({ quiet: true }).then((next) =>
        setList((prev) => (prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next)),
      ),
    enabled,
  );

  return {
    items: list?.items ?? [],
    waitingCount: enabled && list ? list.waitingCount : null,
  };
}
