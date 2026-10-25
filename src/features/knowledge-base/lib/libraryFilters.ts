import type { EntryListParams, EntrySort, EntryStatusFilter } from '../../../lib/api/knowledgeApi';

// Spec 0007, AC-8: the library's search, filters and page live in the URL. Defaults are left out
// of it, and an unknown or malformed value reads as its default. A mechanic always gets Active
// entries sorted by Most seen, whatever the URL says.

export const STATUS_FILTERS: { value: EntryStatusFilter; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ALL', label: 'All' },
];

export const SORTS: { value: EntrySort; label: string }[] = [
  { value: 'seen', label: 'Most seen' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'name', label: 'A to Z' },
];

export type LibraryFilterValues = {
  /** The search already sent (debounced), not the text still being typed. */
  q: string;
  /** A category id, or 'all'. */
  categoryId: string;
  status: EntryStatusFilter;
  sort: EntrySort;
};

export const DEFAULT_LIBRARY_FILTERS: LibraryFilterValues = { q: '', categoryId: 'all', status: 'ACTIVE', sort: 'seen' };

export const LIBRARY_PAGE_SIZE = 20;

/** The server's limit on `q`; a longer `q` in the URL reads as no search. */
export const SEARCH_MAX_LENGTH = 100;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readPage(value: string | null) {
  return value && /^\d+$/.test(value) && Number(value) >= 1 ? Number(value) : 1;
}

export function readLibraryState(params: URLSearchParams, isEditor: boolean) {
  const q = params.get('q')?.trim() ?? '';
  const category = params.get('category');
  const status = STATUS_FILTERS.find((s) => s.value === params.get('status'))?.value;
  const sort = SORTS.find((s) => s.value === params.get('sort'))?.value;
  const filters: LibraryFilterValues = {
    q: q.length <= SEARCH_MAX_LENGTH ? q : '',
    categoryId: category && UUID.test(category) ? category : 'all',
    status: isEditor ? (status ?? DEFAULT_LIBRARY_FILTERS.status) : 'ACTIVE',
    sort: isEditor ? (sort ?? DEFAULT_LIBRARY_FILTERS.sort) : 'seen',
  };
  return { filters, page: readPage(params.get('page')) };
}

/** The URL for these filters and page, with every default left out. */
export function writeLibraryState(filters: LibraryFilterValues, page: number) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.categoryId !== 'all') params.set('category', filters.categoryId);
  if (filters.status !== DEFAULT_LIBRARY_FILTERS.status) params.set('status', filters.status);
  if (filters.sort !== DEFAULT_LIBRARY_FILTERS.sort) params.set('sort', filters.sort);
  if (page > 1) params.set('page', String(page));
  return params;
}

export function hasActiveFilters(filters: LibraryFilterValues) {
  return (
    filters.q !== '' ||
    filters.categoryId !== 'all' ||
    filters.status !== DEFAULT_LIBRARY_FILTERS.status ||
    filters.sort !== DEFAULT_LIBRARY_FILTERS.sort
  );
}

export function libraryParams(filters: LibraryFilterValues, page: number): EntryListParams {
  return {
    q: filters.q || undefined,
    categoryId: filters.categoryId === 'all' ? undefined : filters.categoryId,
    status: filters.status,
    sort: filters.sort,
    page,
  };
}
