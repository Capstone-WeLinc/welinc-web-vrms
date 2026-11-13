import { useCallback, useEffect, useState } from 'react';
import { getMechanicWorkload, type MechanicWorkload } from '../../../lib/api/vrmsConfigApi';
import type { TeamMember } from '../../../types';
import { workloadMap } from '../lib/workload';

/**
 * Every mechanic's open work (feature 57). Loads again each time the user list lands, so it
 * follows the list's own refetch when the tab comes back, plus on `reload` after an unassign or
 * reassign. A failure keeps the last good counts; before any, the map is null and the Work
 * column shows a dash.
 */
export function useWorkload(users: readonly TeamMember[]) {
  const [workload, setWorkload] = useState<ReadonlyMap<string, MechanicWorkload> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const hasUsers = users.length > 0;

  useEffect(() => {
    if (!hasUsers) return;
    let cancelled = false;
    getMechanicWorkload().then(
      (rows) => {
        if (!cancelled) setWorkload(workloadMap(rows));
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
    // users: a new list means the page refetched, so the counts may have moved too
  }, [users, hasUsers, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { workload, reload };
}
