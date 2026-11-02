import { useEffect, useEffectEvent } from 'react';
import { pollDelay } from '../lib/visiblePoll';

/**
 * Spec 0019, AC-21: calls `refresh` every 3 seconds while the tab is visible and `enabled` is true.
 * It pauses while hidden and refetches at once on becoming visible. A tick is skipped while a
 * refresh is still running. After three failures in a row it waits 15 seconds, back to 3 on the
 * next success. `refresh` rejects on failure; keeping the data on screen is the caller's job.
 */
export function useVisiblePoll(refresh: () => Promise<unknown>, enabled: boolean) {
  const tick = useEffectEvent(refresh);

  useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;
    let inFlight = false;
    let failures = 0;
    let stopped = false;

    const schedule = () => {
      window.clearTimeout(timer);
      if (!stopped && !document.hidden) timer = window.setTimeout(run, pollDelay(failures));
    };
    function run() {
      if (inFlight || stopped || document.hidden) return;
      inFlight = true;
      tick()
        .then(
          () => {
            failures = 0;
          },
          () => {
            failures += 1;
          },
        )
        .finally(() => {
          inFlight = false;
          schedule();
        });
    }
    const onVisibility = () => {
      window.clearTimeout(timer);
      // A refresh still running schedules the next one itself when it ends
      if (!document.hidden) run();
    };

    schedule();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);
}
