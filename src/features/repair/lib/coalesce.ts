/**
 * Calls made while a run is going share it, and share one more run after it (a change may have
 * landed since it started). Many callers at once cost two runs, never one each.
 * Many thumbnails failing together when their signed links expire is the case this exists for.
 */
export function createCoalescer() {
  let running: Promise<unknown> | null = null;
  let queued: Promise<unknown> | null = null;
  return function coalesce<T>(run: () => Promise<T>): Promise<T> {
    const start = () => {
      const promise = run().finally(() => {
        running = null;
      });
      running = promise;
      return promise;
    };
    if (!running) return start();
    if (!queued) {
      queued = running.then(() => {
        queued = null;
        return start();
      });
    }
    return queued as Promise<T>;
  };
}
