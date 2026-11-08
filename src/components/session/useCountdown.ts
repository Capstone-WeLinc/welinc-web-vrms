import { useEffect, useState } from 'react';
import { countdown } from '../../lib/session/timing';

/** The time left to a cutoff as `m:ss`, ticking once a second while mounted (spec 0003, AC-23). */
export function useCountdown(cutoff: number): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  return countdown(cutoff - now);
}
