import { useEffect, useState } from 'react';
import { getReleasedTickets, type ReleasedTicket } from '../../../lib/api/vrmsConfigApi';

/**
 * Suite spec 0013, AC-32: the tickets the directory feed released in the last 7 days, read once
 * when the dashboard opens. A failed read shows nothing: the notice is a side note, so it never
 * puts an error on the dashboard. `enabled` false (no mechanics.view) skips the read.
 */
export function useReleasedTickets(enabled: boolean) {
  const [rows, setRows] = useState<ReleasedTicket[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getReleasedTickets().then(
      (data) => {
        if (!cancelled) setRows(data);
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return enabled ? rows : [];
}
