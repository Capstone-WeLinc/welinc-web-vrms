import { useCallback, useEffect, useState } from 'react';
import { getSystems } from '../../../lib/api/authApi';
import type { CatalogRole } from '../../../types';

export type VrmsRoles = {
  status: 'loading' | 'error' | 'ready';
  /** Empty until ready. */
  roles: CatalogRole[];
  retry: () => void;
};

/**
 * The VRMS roles from welinc-auth's catalog (spec 0004, AC-20): names, descriptions and order, so
 * a new role shows in the picker and the filter with no web change. Called once by UsersPage and
 * passed down, so the page makes one request.
 */
export function useVrmsRoles(): VrmsRoles {
  const [state, setState] = useState<Omit<VrmsRoles, 'retry'>>({
    status: 'loading',
    roles: [],
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getSystems().then(
      (systems) => {
        if (cancelled) return;
        const vrms = systems.find((system) => system.code === 'VRMS');
        setState(vrms ? { status: 'ready', roles: vrms.roles } : { status: 'error', roles: [] });
      },
      () => {
        if (!cancelled) setState({ status: 'error', roles: [] });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading', roles: [] });
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, retry };
}
