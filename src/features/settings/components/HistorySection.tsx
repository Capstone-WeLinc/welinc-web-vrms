import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DetailSection } from '../../../components/shared/DetailSection';
import { EmptyState } from '../../../components/shared/EmptyState';
import { ErrorState } from '../../../components/shared/ErrorState';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { getSettingChanges, type HistoryChange, type HistoryKind } from '../../../lib/api/settingsApi';
import { HISTORY_PAGE_SIZE } from '../lib/changes';
import { ChangeList } from './ChangeList';

const FILTERS: { value: HistoryKind; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'setting', label: 'Settings' },
  { value: 'permission', label: 'Permissions' },
];

type Page = { kind: HistoryKind; attempt: number; rows: HistoryChange[]; next: string | null } | { kind: HistoryKind; attempt: number; error: string };

/** Spec 0012, AC-26: setting and permission changes merged, newest first, 20 per page. */
export function HistorySection() {
  const [kind, setKind] = useState<HistoryKind>('all');
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState<Page | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSettingChanges({ kind, limit: HISTORY_PAGE_SIZE })
      .then((res) => {
        if (!cancelled) setPage({ kind, attempt, rows: res.data, next: res.nextCursor });
      })
      .catch((err) => {
        if (!cancelled) setPage({ kind, attempt, error: getApiErrorMessage(err, 'Could not load the change history.') });
      });
    return () => {
      cancelled = true;
    };
  }, [kind, attempt]);

  const current = page && page.kind === kind && page.attempt === attempt ? page : null;

  const loadMore = async () => {
    if (!current || 'error' in current || !current.next) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const res = await getSettingChanges({ kind, limit: HISTORY_PAGE_SIZE, cursor: current.next });
      setPage({ ...current, rows: [...current.rows, ...res.data], next: res.nextCursor });
    } catch (err) {
      setMoreError(getApiErrorMessage(err, 'Could not load more changes.'));
    } finally {
      setLoadingMore(false);
    }
  };

  let body;
  if (!current) {
    body = (
      <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading change history">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  } else if ('error' in current) {
    body = <ErrorState title="Couldn’t load the change history." message={current.error} onRetry={() => setAttempt((n) => n + 1)} retryText="Retry" />;
  } else if (current.rows.length === 0) {
    body = <EmptyState title="No changes yet." description="Settings and permission changes show here." icon={History} />;
  } else {
    body = (
      <>
        <ChangeList changes={current.rows} />
        {moreError && <p className="text-sm text-destructive">{moreError}</p>}
        {current.next && (
          <Button type="button" variant="outline" className="self-start" onClick={loadMore} loading={loadingMore}>
            Load more
          </Button>
        )}
      </>
    );
  }

  return (
    <DetailSection title="Change history">
      <ToggleGroup type="single" variant="outline" value={kind} onValueChange={(v) => v && setKind(v as HistoryKind)} aria-label="Show changes of">
        {FILTERS.map((f) => (
          <ToggleGroupItem key={f.value} value={f.value} className="min-h-11 px-4">
            {f.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {body}
    </DetailSection>
  );
}
