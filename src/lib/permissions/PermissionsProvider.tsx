import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AbilityProvider } from '@casl/react';
import { getMyPermissions } from '../api/permissionsApi';
import { getApiErrorMessage } from '../api/errors';
import { NO_PERMISSIONS, PermissionsContext, type PermissionsStatus } from './context';
import { buildAbility, FORBIDDEN_EVENT, PERMISSIONS_REFETCH_MS } from './keys';

interface Loaded {
  status: PermissionsStatus;
  ability: typeof NO_PERMISSIONS;
  keys: readonly string[];
  error?: string;
}

function sameKeys(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((key) => b.includes(key));
}

/**
 * Spec 0011, AC-23: fetches the caller's keys after sign in, again on window focus, every
 * 60 seconds and right after any 403. Once loaded, a failed refetch keeps the last keys.
 */
export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading', ability: NO_PERMISSIONS, keys: [] });
  const inFlight = useRef(false);

  const load = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    getMyPermissions()
      .then(({ keys }) => {
        setLoaded((prev) =>
          prev.status === 'ready' && sameKeys(prev.keys, keys)
            ? prev
            : { status: 'ready', ability: buildAbility(keys), keys },
        );
      })
      .catch((err) => {
        // A 401 signs out in the axios instance; anything else only matters before the first load
        setLoaded((prev) =>
          prev.status === 'ready'
            ? prev
            : { ...prev, status: 'error', error: getApiErrorMessage(err, 'Could not load your permissions.') },
        );
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, PERMISSIONS_REFETCH_MS);
    window.addEventListener('focus', load);
    window.addEventListener(FORBIDDEN_EVENT, load);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', load);
      window.removeEventListener(FORBIDDEN_EVENT, load);
    };
  }, [load]);

  const retry = useCallback(() => {
    setLoaded((prev) => ({ ...prev, status: 'loading', error: undefined }));
    load();
  }, [load]);

  const state = useMemo(() => ({ ...loaded, retry }), [loaded, retry]);

  return (
    <PermissionsContext.Provider value={state}>
      <AbilityProvider value={loaded.ability}>{children}</AbilityProvider>
    </PermissionsContext.Provider>
  );
}
