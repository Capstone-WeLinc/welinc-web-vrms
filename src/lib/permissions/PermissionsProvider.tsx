import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AbilityProvider } from '@casl/react';
import { getMyPermissions } from '../api/permissionsApi';
import { getApiErrorMessage } from '../api/errors';
import { NO_PERMISSIONS, PermissionsContext, type PermissionsStatus } from './context';
import { ALL_MODULES_ON, buildAbility, FORBIDDEN_EVENT, PERMISSIONS_REFETCH_MS, type Modules } from './keys';

interface Loaded {
  status: PermissionsStatus;
  ability: typeof NO_PERMISSIONS;
  keys: readonly string[];
  modules: Modules;
  inRoster: boolean;
  error?: string;
}

function sameKeys(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((key) => b.includes(key));
}

function sameModules(a: Modules, b: Modules) {
  return a.ai === b.ai && a.analytics === b.analytics && a.knowledge === b.knowledge;
}

/**
 * Spec 0011, AC-23: fetches the caller's keys after sign in, again on window focus, every
 * 60 seconds and right after any 403. Once loaded, a failed refetch keeps the last keys.
 * Spec 0012, AC-12: the modules are compared too, so a modules only change still updates.
 */
export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState<Loaded>({
    status: 'loading',
    ability: NO_PERMISSIONS,
    keys: [],
    modules: ALL_MODULES_ON,
    inRoster: false,
  });
  const inFlight = useRef(false);

  const load = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    getMyPermissions()
      .then(({ keys, modules, inRoster = false }) => {
        setLoaded((prev) =>
          prev.status === 'ready' &&
          sameKeys(prev.keys, keys) &&
          sameModules(prev.modules, modules) &&
          prev.inRoster === inRoster
            ? prev
            : { status: 'ready', ability: buildAbility(keys), keys, modules, inRoster },
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

  const state = useMemo(() => ({ ...loaded, retry, refresh: load }), [loaded, retry, load]);

  return (
    <PermissionsContext.Provider value={state}>
      <AbilityProvider value={loaded.ability}>{children}</AbilityProvider>
    </PermissionsContext.Provider>
  );
}
