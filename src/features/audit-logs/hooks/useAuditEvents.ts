import { useEffect, useState } from 'react';
import { resolveRange } from '../../../components/shared/date-range/dateRange';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { getAuditEvents, type AuditEventParams } from '../../../lib/api/auditApi';
import { getApiErrorMessage } from '../../../lib/api/errors';
import type { AuditEvent } from '../../../types';
import { AUDIT_PAGE_SIZE, type AuditFilterValues } from '../lib/auditEvents';

type Timeline = {
  key: string;
  status: 'ready' | 'error';
  events: AuditEvent[];
  nextCursor: string | null;
  errorMessage?: string;
  more: 'idle' | 'loading' | 'error';
};

function toParams(filters: AuditFilterValues, repairNumber: string): AuditEventParams | null {
  const range = resolveRange(filters.range);
  if (range.status !== 'ready') return null;
  const search = repairNumber.trim();
  return {
    type: filters.type === 'all' ? undefined : filters.type,
    actorId: filters.actorId === 'all' ? undefined : filters.actorId,
    from: range.from,
    to: range.to,
    // Under 2 characters the server ignores it anyway, so don't send it
    repairNumber: search.length >= 2 ? search : undefined,
    limit: AUDIT_PAGE_SIZE,
  };
}

/**
 * The audit timeline: newest 50 first, then older pages by cursor. A filter change
 * reloads from the newest event; a failed "load older" keeps what's already shown.
 */
export function useAuditEvents(filters: AuditFilterValues) {
  const repairNumber = useDebouncedValue(filters.repairNumber, 300);
  const [attempt, setAttempt] = useState(0);
  const [timeline, setTimeline] = useState<Timeline | null>(null);

  const params = toParams(filters, repairNumber);
  const paramsJson = params ? JSON.stringify(params) : null;
  const key = paramsJson === null ? null : `${attempt}:${paramsJson}`;

  useEffect(() => {
    if (paramsJson === null) return;
    const key = `${attempt}:${paramsJson}`;
    let cancelled = false;
    getAuditEvents(JSON.parse(paramsJson) as AuditEventParams)
      .then((page) => {
        if (!cancelled) setTimeline({ key, status: 'ready', events: page.data, nextCursor: page.nextCursor, more: 'idle' });
      })
      .catch((err) => {
        if (cancelled) return;
        setTimeline({
          key,
          status: 'error',
          events: [],
          nextCursor: null,
          more: 'idle',
          errorMessage: getApiErrorMessage(err, 'The audit log didn’t load.'),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [paramsJson, attempt]);

  const loadOlder = () => {
    if (!timeline || !timeline.nextCursor || !paramsJson || timeline.more === 'loading') return;
    const { key, nextCursor } = timeline;
    setTimeline({ ...timeline, more: 'loading' });
    // The same filters go with every cursor; the cursor is only a position.
    getAuditEvents({ ...(JSON.parse(paramsJson) as AuditEventParams), cursor: nextCursor })
      .then((page) =>
        setTimeline((current) =>
          current && current.key === key
            ? { ...current, events: [...current.events, ...page.data], nextCursor: page.nextCursor, more: 'idle' }
            : current,
        ),
      )
      .catch(() => setTimeline((current) => (current && current.key === key ? { ...current, more: 'error' } : current)));
  };

  // Loading until the latest filters have answered; derived, so the effect sets no state synchronously.
  const state: 'loading' | 'error' | 'ready' =
    !timeline || (key !== null && timeline.key !== key) ? 'loading' : timeline.status;

  return {
    state,
    events: timeline?.events ?? [],
    hasOlder: !!timeline?.nextCursor,
    more: timeline?.more ?? 'idle',
    errorMessage: timeline?.errorMessage,
    loadOlder,
    retry: () => setAttempt((n) => n + 1),
  };
}
