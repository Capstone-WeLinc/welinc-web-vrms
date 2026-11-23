import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '../../../components/shared/data-table/Pagination';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import type { KnowledgeEntrySummary } from '../../../lib/api/knowledgeApi';
import { entryMetaLine } from '../lib/entryFormat';
import { LIBRARY_PAGE_SIZE } from '../lib/libraryFilters';

// Cards that stack on a phone, one bordered list from 1024px (AC-9).
const LIST = 'flex flex-col gap-3 lg:gap-0 lg:divide-y lg:divide-border lg:overflow-hidden lg:rounded-2xl lg:border lg:border-transparent lg:bg-card lg:shadow-card';
const ITEM = 'rounded-2xl border border-transparent bg-card shadow-card lg:rounded-none lg:border-0 lg:shadow-none';

interface EntryResultsProps {
  entries: KnowledgeEntrySummary[];
  total: number;
  page: number;
  isEditor: boolean;
  /** Where the entry page's back link returns: this library view. */
  from: string;
  onPageChange: (page: number) => void;
}

export function EntryResults({ entries, total, page, isEditor, from, onPageChange }: EntryResultsProps) {
  return (
    <div className="flex flex-col gap-3 lg:gap-0">
      <p className="sr-only" aria-live="polite">
        {total === 1 ? '1 entry found' : `${total} entries found`}
      </p>
      <ul aria-label="Knowledge base entries" className={LIST}>
        {entries.map((entry) => (
          <li key={entry.id} className={ITEM}>
            <Link
              to={`/knowledge-base/${entry.id}`}
              state={{ from }}
              className="group flex min-h-11 items-center gap-3 p-4 outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset lg:px-5"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground group-hover:underline">{entry.name}</span>
                  <Badge variant="outline">{entry.category.name}</Badge>
                  {isEditor && entry.status !== 'ACTIVE' && <StatusBadge status={entry.status} />}
                </div>
                <p className="truncate text-body text-muted-foreground">{entry.symptoms}</p>
                <p className="text-caption text-muted-foreground tabular-nums">{entryMetaLine(entry)}</p>
              </div>
              <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
      {total > LIBRARY_PAGE_SIZE && (
        <div className="rounded-2xl border border-transparent bg-card shadow-card *:border-t-0 lg:mt-3">
          <Pagination page={page} pageSize={LIBRARY_PAGE_SIZE} total={total} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  );
}

/** Six rows shaped like results (AC-11). */
export function EntryResultsSkeleton() {
  return (
    <ul aria-hidden="true" className={LIST}>
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index} className={`${ITEM} flex flex-col gap-2 p-4 lg:px-5`}>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-56" />
        </li>
      ))}
    </ul>
  );
}
