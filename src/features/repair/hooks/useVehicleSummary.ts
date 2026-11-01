import { useCallback, useEffect, useState } from 'react';
import { getVehicleSummary, type VehicleSummary } from '../../../lib/api/vrmsConfigApi';

type Loaded = { vehicleId: string; summary: VehicleSummary } | { vehicleId: string; failed: true };

export interface VehicleSummaryState {
  summary: VehicleSummary | null;
  loading: boolean;
  failed: boolean;
  retrying: boolean;
  retry: () => void;
}

/**
 * The facts about the picked truck (spec 0016, AC-11 and AC-12). `vehicleId` is empty until a
 * truck is picked. Results for a truck that is no longer picked are ignored.
 */
export function useVehicleSummary(vehicleId: string): VehicleSummaryState {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!vehicleId) return;
    let cancelled = false;
    getVehicleSummary(vehicleId)
      .then((summary) => {
        if (!cancelled) setLoaded({ vehicleId, summary });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ vehicleId, failed: true });
      })
      .finally(() => {
        if (!cancelled) setRetrying(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vehicleId, attempt]);

  const retry = useCallback(() => {
    setRetrying(true);
    setAttempt((n) => n + 1);
  }, []);

  const current = vehicleId && loaded?.vehicleId === vehicleId ? loaded : null;
  return {
    summary: current && 'summary' in current ? current.summary : null,
    loading: !!vehicleId && !current,
    failed: !!current && 'failed' in current,
    retrying,
    retry,
  };
}
