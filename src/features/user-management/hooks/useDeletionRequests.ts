import { useCallback, useEffect, useState } from 'react';
import {
  getGraceAccounts,
  getPendingDeletions,
  type DeletionPage,
  type DeletionRequest,
  type GraceAccount,
} from '../../../lib/api/authApi';
import { getApiErrorMessage } from '../../../lib/api/errors';

type ListState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; rows: T[]; nextCursor: string | null; loadingMore: boolean };

const ready = <T,>(page: DeletionPage<T>): ListState<T> => ({
  status: 'ready',
  rows: page.data,
  nextCursor: page.nextCursor,
  loadingMore: false,
});

/**
 * Suite spec 0012, AC-9, AC-23: the first page of pending requests and of accounts in grace, with
 * Load more on each. `reload` refetches both from the start (after a decision or a restore).
 */
export function useDeletionRequests() {
  const [pending, setPending] = useState<ListState<DeletionRequest>>({ status: 'loading' });
  const [grace, setGrace] = useState<ListState<GraceAccount>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getPendingDeletions()
      .then((page) => !cancelled && setPending(ready(page)))
      .catch((err) => !cancelled && setPending({ status: 'error', message: getApiErrorMessage(err, 'Deletion requests didn’t load.') }));
    getGraceAccounts()
      .then((page) => !cancelled && setGrace(ready(page)))
      .catch((err) => !cancelled && setGrace({ status: 'error', message: getApiErrorMessage(err, 'Deleted accounts didn’t load.') }));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const morePending = useCallback(async () => {
    if (pending.status !== 'ready' || !pending.nextCursor) return;
    setPending({ ...pending, loadingMore: true });
    try {
      const page = await getPendingDeletions(pending.nextCursor);
      setPending({ status: 'ready', rows: [...pending.rows, ...page.data], nextCursor: page.nextCursor, loadingMore: false });
    } catch {
      setPending({ ...pending, loadingMore: false });
    }
  }, [pending]);

  const moreGrace = useCallback(async () => {
    if (grace.status !== 'ready' || !grace.nextCursor) return;
    setGrace({ ...grace, loadingMore: true });
    try {
      const page = await getGraceAccounts(grace.nextCursor);
      setGrace({ status: 'ready', rows: [...grace.rows, ...page.data], nextCursor: page.nextCursor, loadingMore: false });
    } catch {
      setGrace({ ...grace, loadingMore: false });
    }
  }, [grace]);

  return { pending, grace, reload, morePending, moreGrace };
}
