import { useEffect, useState } from 'react';

/** Milliseconds left to a cutoff, updated once a second while mounted (suite spec 0016, AC-12). */
export function useTimeLeft(cutoff: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  return cutoff - now;
}
