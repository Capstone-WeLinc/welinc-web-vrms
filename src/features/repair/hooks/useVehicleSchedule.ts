import { useCallback, useEffect, useState } from 'react';
import { getVehicleSchedule, type UpcomingTrips } from '../../../lib/api/expediteApi';

type Loaded = { vehicleId: string; trips: UpcomingTrips };

export interface VehicleScheduleState {
  /** Null while loading or with no truck picked. */
  trips: UpcomingTrips | null;
  loading: boolean;
  retrying: boolean;
  retry: () => void;
}

/**
 * Spec 0029 (child 0003), AC-16: the truck's upcoming trips from BMS, read once per truck (and on
 * Retry), never on the ticket page's 3 s refresh. `vehicleId` is empty until a truck is picked.
 * Any failure reads as `{ available: false }`, the same as the server's answer when BMS is down.
 */
export function useVehicleSchedule(vehicleId: string): VehicleScheduleState {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!vehicleId) return;
    let cancelled = false;
    getVehicleSchedule(vehicleId)
      .then((trips) => {
        if (!cancelled) setLoaded({ vehicleId, trips });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ vehicleId, trips: { available: false } });
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
  return { trips: current?.trips ?? null, loading: !!vehicleId && !current, retrying, retry };
}
