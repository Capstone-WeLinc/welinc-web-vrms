import { useCallback, useEffect, useState } from 'react';
import { getAttachments, type AttachmentList } from '../../../lib/api/attachmentsApi';
import { getApiErrorMessage } from '../../../lib/api/errors';

type Loaded =
  | { key: string; status: 'ready'; list: AttachmentList }
  | { key: string; status: 'error'; message: string };

/**
 * A ticket's files with their signed links (spec 0017). `reload` fetches fresh links in the
 * background and keeps the current list on screen if that fails.
 */
export function useTicketAttachments(ticketId: string) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const key = `${attempt}:${ticketId}`;

  useEffect(() => {
    const key = `${attempt}:${ticketId}`;
    let cancelled = false;
    getAttachments(ticketId)
      .then((list) => {
        if (!cancelled) setLoaded({ key, status: 'ready', list });
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
          setLoaded((prev) => (prev && prev.key === key ? { key, status: 'ready', list } : prev));
          return list;
        })
        .catch(() => null),
    [ticketId, key],
  );

  return {
    state: (current ? current.status : 'loading') as 'loading' | 'error' | 'ready',
    list: current?.status === 'ready' ? current.list : null,
    errorMessage: current?.status === 'error' ? current.message : undefined,
    reload,
    retry: () => setAttempt((n) => n + 1),
  };
}
