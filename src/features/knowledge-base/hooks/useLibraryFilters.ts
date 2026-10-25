import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DEFAULT_LIBRARY_FILTERS,
  readLibraryState,
  writeLibraryState,
  type LibraryFilterValues,
} from '../lib/libraryFilters';

const SEARCH_DELAY_MS = 300;

/**
 * The library's filters and page in the URL (spec 0007, AC-8). Every change replaces the history
 * entry and goes back to page 1. The search box text is local and reaches `q` 300ms after typing stops.
 */
export function useLibraryFilters(isEditor: boolean) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { filters, page } = readLibraryState(searchParams, isEditor);
  const [searchText, setSearchTextState] = useState(filters.q);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Functional updates, so a debounced search never writes back filters it read before a later change.
  const setFilters = (patch: Partial<LibraryFilterValues>) =>
    setSearchParams(
      (current) => {
        const state = readLibraryState(current, isEditor);
        const next = { ...state.filters, ...patch };
        const keys = Object.keys(patch) as (keyof LibraryFilterValues)[];
        return keys.some((k) => next[k] !== state.filters[k]) ? writeLibraryState(next, 1) : current;
      },
      { replace: true },
    );

  const setPage = (nextPage: number) =>
    setSearchParams((current) => writeLibraryState(readLibraryState(current, isEditor).filters, nextPage), { replace: true });

  const setSearchText = (text: string) => {
    setSearchTextState(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFilters({ q: text.trim() }), SEARCH_DELAY_MS);
  };

  const clearSearch = () => {
    window.clearTimeout(timer.current);
    setSearchTextState('');
    setFilters({ q: '' });
  };

  const clearFilters = () => {
    window.clearTimeout(timer.current);
    setSearchTextState('');
    setSearchParams(writeLibraryState(DEFAULT_LIBRARY_FILTERS, 1), { replace: true });
  };

  return { filters, page, searchText, setSearchText, clearSearch, setFilters, setPage, clearFilters };
}
