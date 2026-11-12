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
import { useSettings } from '../hooks/useSettings';
import { HISTORY_PAGE_SIZE, unitsByKey } from '../lib/changes';
import { ChangeList } from './ChangeList';

const FILTERS: { value: HistoryKind; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'setting', label: 'Settings' },
  // Suite spec 0013, AC-30: permission changes are in the portal's Permissions view now
  { value: 'lookup', label: 'Lookup lists' },
];

type Load = { kind: HistoryKind; attempt: number };
type Page = (Load & { rows: HistoryChange[]; next: string | null }) | (Load & { error: string });
/** A Load more in flight or failed, for the page it was asked on. */
type More = Load & { loading: boolean; error: string | null };

const sameLoad = (a: Load | null, b: Load) => a !== null && a.kind === b.kind && a.attempt === b.attempt;

/** Spec 0012, AC-26: setting and lookup changes merged, newest first, 20 per page. */
export function HistorySection() {
  const [kind, setKind] = useState<HistoryKind>('all');
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState<Page | null>(null);
  const [more, setMore] = useState<More | null>(null);
  // Only for the units beside each value; the history shows without them if this fails
  const settings = useSettings();
  const units = unitsByKey(settings.data?.settings ?? []);

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

  const current = sameLoad(page, { kind, attempt }) ? page : null;
  const currentMore = sameLoad(more, { kind, attempt }) ? more : null;

  const loadMore = async () => {
    if (!current || 'error' in current || !current.next) return;
    const at: Load = { kind: current.kind, attempt: current.attempt };
    setMore({ ...at, loading: true, error: null });
    try {
      const res = await getSettingChanges({ kind: at.kind, limit: HISTORY_PAGE_SIZE, cursor: current.next });
      // A filter switched while this loaded has its own page now; leave it alone
      setPage((prev) =>
        prev && sameLoad(prev, at) && !('error' in prev) ? { ...prev, rows: [...prev.rows, ...res.data], next: res.nextCursor } : prev,
      );
      setMore((prev) => (sameLoad(prev, at) ? null : prev));
    } catch (err) {
      const error = getApiErrorMessage(err, 'Could not load more changes.');
      setMore((prev) => (sameLoad(prev, at) ? { ...at, loading: false, error } : prev));
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
    body = <EmptyState title="No changes yet." description="Setting and lookup list changes show here." icon={History} />;
  } else {
    body = (
      <>
        <ChangeList changes={current.rows} units={units} />
        {currentMore?.error && <p className="text-sm text-destructive">{currentMore.error}</p>}
        {current.next && (
          <Button type="button" variant="outline" className="self-start" onClick={loadMore} loading={currentMore?.loading === true}>
            Load more
          </Button>
        )}
      </>
    );
  }

  return (
    <DetailSection title="All changes">
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
