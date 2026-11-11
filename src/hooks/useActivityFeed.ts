import { useEffect, useState } from 'react';
import { getApiErrorMessage } from '../lib/api/errors';
import { getActivityCatalog, type ActivityEvent, type ActivityPage } from '../lib/api/activityApi';
import { getSystems } from '../lib/api/authApi';
import type { ActivityLabels } from '../lib/activity/activityFormat';

export type ActivityFeedState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; events: ActivityEvent[]; nextCursor: string | null; loadingMore: boolean; moreError: string | null };

/**
 * One activity list (spec 0011, AC-19, AC-20): the first page of `load` while `enabled`, again
 * when `key` changes or on `reload()`, and the next page in place on `loadMore()`. The catalog and
 * the systems list load beside it; if either fails the rows fall back to codes.
 */
export function useActivityFeed(load: (cursor: string | null) => Promise<ActivityPage>, key: string, enabled = true) {
  const [state, setState] = useState<ActivityFeedState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [loadedKey, setLoadedKey] = useState(key);
  const [labels, setLabels] = useState<ActivityLabels>({ catalog: null, systems: [] });

  // A new key (other filters, another person) starts from the loading state, set during render
  if (key !== loadedKey) {
    setLoadedKey(key);
    setState({ status: 'loading' });
  }

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    load(null)
      .then((page) => {
        if (!cancelled) setState({ status: 'ready', events: page.data, nextCursor: page.nextCursor, loadingMore: false, moreError: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', message: getApiErrorMessage(err, 'The activity didn’t load.') });
      });
    return () => {
      cancelled = true;
    };
    // `load` is a new function each render; `key` names what it loads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt, enabled]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    Promise.allSettled([getActivityCatalog(), getSystems()]).then(([catalog, systems]) => {
      if (cancelled) return;
      setLabels({
        catalog: catalog.status === 'fulfilled' ? catalog.value : null,
        systems: systems.status === 'fulfilled' ? systems.value : [],
      });
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, attempt]);

  const reload = () => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  };

  const loadMore = () => {
    if (state.status !== 'ready' || !state.nextCursor || state.loadingMore) return;
    const cursor = state.nextCursor;
    // The list this page belongs to: a reload or a new key in between replaces it, and the late
    // page is dropped
    const forEvents = state.events;
    setState({ ...state, loadingMore: true, moreError: null });
    load(cursor)
      .then((page) => {
        setState((current) =>
          current.status === 'ready' && current.events === forEvents
            ? { ...current, events: [...current.events, ...page.data], nextCursor: page.nextCursor, loadingMore: false }
            : current,
        );
      })
      .catch((err) => {
        setState((current) =>
          current.status === 'ready' && current.events === forEvents
            ? { ...current, loadingMore: false, moreError: getApiErrorMessage(err, 'The next events didn’t load.') }
            : current,
        );
      });
  };

  return { state, labels, reload, loadMore };
}
