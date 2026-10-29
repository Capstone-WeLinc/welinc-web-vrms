import { useEffect, useState } from 'react';
import { getApiErrorMessage } from '../../../lib/api/errors';
import {
  getPermissionChanges,
  getPermissionMatrix,
  type PermissionChange,
  type PermissionMatrix,
} from '../../../lib/api/permissionsApi';
import { RECENT_CHANGES } from '../lib/permissionChanges';

type Loaded =
  | { attempt: number; status: 'ready'; matrix: PermissionMatrix; changes: PermissionChange[] }
  | { attempt: number; status: 'error'; message: string };

/** The matrix and its last changes, read together for the Users page section (spec 0011, AC-25). */
export function usePermissionMatrix() {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getPermissionMatrix(), getPermissionChanges(RECENT_CHANGES)])
      .then(([matrix, changes]) => {
        if (!cancelled) setLoaded({ attempt, status: 'ready', matrix, changes: changes.data });
      })
      .catch((err) => {
        if (!cancelled) setLoaded({ attempt, status: 'error', message: getApiErrorMessage(err, 'Couldn’t load the permissions.') });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const current = loaded?.attempt === attempt ? loaded : null;
  return {
    state: current ? current.status : ('loading' as const),
    matrix: current?.status === 'ready' ? current.matrix : null,
    changes: current?.status === 'ready' ? current.changes : [],
    errorMessage: current?.status === 'error' ? current.message : undefined,
    retry: () => setAttempt((n) => n + 1),
  };
}
