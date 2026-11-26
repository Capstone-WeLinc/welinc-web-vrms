import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Plus, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { lastPage } from '../../../components/shared/data-table/types';
import { EmptyState } from '../../../components/shared/EmptyState';
import { ErrorState } from '../../../components/shared/ErrorState';
import { useCan } from '../../../lib/permissions/usePermissions';
import { EntryResults, EntryResultsSkeleton } from '../components/EntryResults';
import { KnowledgeHeader } from '../components/KnowledgeHeader';
import { LibrarySearchBand } from '../components/LibrarySearchBand';
import { SuggestDialog } from '../components/SuggestDialog';
import { useCategories, useEntryList } from '../hooks/useKnowledgeData';
import { useLibraryFilters } from '../hooks/useLibraryFilters';
import { LIBRARY_PAGE_SIZE, libraryParams } from '../lib/libraryFilters';

// The old page kept made up SOPs in the browser; nothing reads them any more (AC-11).
const OLD_ARTICLES_KEY = 'welinc_kb_articles';

const PANEL = 'rounded-2xl border border-transparent bg-card shadow-card';

/** The common issues library (spec 0007, AC-6 to AC-11). */
export function KnowledgeLibraryPage() {
  const isEditor = useCan('knowledge.edit');
  // Editors write entries themselves; a reader with knowledge.suggest sends a suggestion
  const suggests = useCan('knowledge.suggest') && !isEditor;
  const location = useLocation();
  const { filters, page, searchText, setSearchText, clearSearch, setFilters, setPage, clearFilters } = useLibraryFilters(isEditor);
  const list = useEntryList(libraryParams(filters, page));
  const categories = useCategories();
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    try {
      localStorage.removeItem(OLD_ARTICLES_KEY);
    } catch {
      // Storage can be blocked; there is nothing to clean up then.
    }
  }, []);

  // A page past the last one (entries deactivated since the link was made) moves to the last page.
  const total = list.data?.total ?? 0;
  const last = lastPage(total, LIBRARY_PAGE_SIZE);
  const pastEnd = list.state === 'ready' && total > 0 && page > last;
  useEffect(() => {
    if (pastEnd) setPage(last);
  }, [pastEnd, last, setPage]);

  const newEntry = isEditor ? (
    <Button asChild>
      <Link to="/knowledge-base/new">
        <Plus aria-hidden="true" />
        New entry
      </Link>
    </Button>
  ) : undefined;

  let body;
  if (list.state === 'error') {
    body = (
      <ErrorState kind="page" title="Couldn’t load the knowledge base." message={list.errorMessage ?? 'Check your connection, then try again.'} onRetry={list.retry} retryText="Retry" />
    );
  } else if (list.state === 'loading' || pastEnd || !list.data) {
    body = <EntryResultsSkeleton />;
  } else if (list.data.libraryTotal === 0) {
    body = (
      <div className={PANEL}>
        {isEditor ? (
          <EmptyState
            icon={BookOpen}
            title="No entries yet."
            description="Start from suggestions, or add one."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild variant="outline">
                  <Link to="/knowledge-base/suggestions">Open suggestions</Link>
                </Button>
                {newEntry}
              </div>
            }
          />
        ) : (
          <EmptyState icon={BookOpen} title="No known fixes yet." description="Fixes your team adds show up here." />
        )}
      </div>
    );
  } else if (list.data.data.length === 0) {
    body = (
      <div className={PANEL}>
        <EmptyState
          icon={SearchX}
          title="No entries match your search."
          description="Try other words, or clear the filters to see every entry."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
              {suggests && <Button onClick={() => setSuggesting(true)}>Suggest an entry</Button>}
            </div>
          }
        />
      </div>
    );
  } else {
    body = (
      <EntryResults
        entries={list.data.data}
        total={list.data.total}
        page={page}
        isEditor={isEditor}
        from={location.pathname + location.search}
        onPageChange={setPage}
      />
    );
  }

  return (
    <div>
      <KnowledgeHeader isEditor={isEditor} action={newEntry} />
      <LibrarySearchBand
        value={filters}
        searchText={searchText}
        categories={categories.data ?? []}
        categoryCounts={list.data?.categoryCounts ?? null}
        isEditor={isEditor}
        onSearchTextChange={setSearchText}
        onClearSearch={clearSearch}
        onChange={setFilters}
      />
      {body}
      {suggests && (
        <SuggestDialog open={suggesting} onOpenChange={setSuggesting} kind="NEW_ENTRY" initialBody={filters.q} />
      )}
    </div>
  );
}
