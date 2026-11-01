import { useCallback, useEffect, useRef, useState } from 'react';
import { getAttachments, type AttachmentList } from '../../../lib/api/attachmentsApi';
import { getApiErrorMessage } from '../../../lib/api/errors';

type Loaded =
  | { key: string; status: 'ready'; list: AttachmentList }
  | { key: string; status: 'error'; message: string };

/** A list older than this is fetched again when the window regains focus (AC-26). */
const STALE_MS = 8 * 60 * 1000;

/**
 * A ticket's files with their signed links (spec 0017). `reload` fetches fresh links in the
 * background and keeps the current list on screen if that fails. Links last 10 to 20 minutes,
 * so a list older than 8 minutes is refreshed on focus without the user noticing (AC-26).
 */
export function useTicketAttachments(ticketId: string) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const fetchedAt = useRef(0);
  const key = `${attempt}:${ticketId}`;

  useEffect(() => {
    const key = `${attempt}:${ticketId}`;
    let cancelled = false;
    getAttachments(ticketId)
      .then((list) => {
        if (cancelled) return;
        fetchedAt.current = Date.now();
        setLoaded({ key, status: 'ready', list });
      })
      .catch((err) => {
        if (!cancelled) setLoaded({ key, status: 'error', message: getApiErrorMessage(err, 'Photos and documents didn’t load.') });
      });
    return () => {
      cancelled = true;
    };
  }, [ticketId, attempt]);

  const current = loaded?.key === key ? loaded : null;

  const reload = useCallback(
    () =>
      getAttachments(ticketId)
        .then((list) => {
          fetchedAt.current = Date.now();
          setLoaded((prev) => (prev && prev.key === key ? { key, status: 'ready', list } : prev));
          return list;
        })
        .catch(() => null),
    [ticketId, key],
  );

  useEffect(() => {
    const refreshIfStale = () => {
      if (document.visibilityState === 'visible' && fetchedAt.current > 0 && Date.now() - fetchedAt.current > STALE_MS) {
        void reload();
      }
    };
    window.addEventListener('focus', refreshIfStale);
    document.addEventListener('visibilitychange', refreshIfStale);
    return () => {
      window.removeEventListener('focus', refreshIfStale);
      document.removeEventListener('visibilitychange', refreshIfStale);
    };
  }, [reload]);

  return {
    state: (current ? current.status : 'loading') as 'loading' | 'error' | 'ready',
    list: current?.status === 'ready' ? current.list : null,
    errorMessage: current?.status === 'error' ? current.message : undefined,
    reload,
    retry: () => setAttempt((n) => n + 1),
  };
}
