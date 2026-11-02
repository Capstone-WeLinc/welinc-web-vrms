import { useEffect, useState } from 'react';
import { getDrivers, type DriverOption } from '../../../lib/api/vrmsConfigApi';

const SEARCH_DELAY_MS = 250;

/**
 * Active drivers matching what is typed, searched on the server (spec 0016, AC-13). The create
 * form and the details edit (spec 0019, AC-4) both use it.
 */
export function useDriverSearch() {
  const [query, setQuery] = useState('');
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // The first load (no text) goes out right away; typing waits a beat
    const timer = setTimeout(
      () => {
        getDrivers(query.trim() || undefined)
          .then((rows) => {
            if (cancelled) return;
            setDrivers(rows);
            setFailed(false);
          })
          .catch(() => {
            if (!cancelled) setFailed(true);
          })
          .finally(() => {
            if (!cancelled) setRetrying(false);
          });
      },
      query ? SEARCH_DELAY_MS : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, attempt]);

  const retry = () => {
    setRetrying(true);
    setAttempt((n) => n + 1);
  };
  return { drivers, failed, retrying, retry, setQuery };
}
