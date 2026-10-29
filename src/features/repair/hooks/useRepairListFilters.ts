import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DEFAULT_REPAIR_LIST_FILTERS,
  readListState,
  writeListState,
  type RepairListFilterValues,
} from '../lib/repairListFilters';

const SEARCH_DELAY_MS = 300;

/**
 * The list's filters and page, read from and written to the URL (spec 0004, AC-5). Every
 * change replaces the history entry, and any filter change goes back to page 1. The search
 * box text is local and reaches the URL 300ms after typing stops.
 */
export function useRepairListFilters(seesAll: boolean) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { filters, page } = readListState(searchParams, seesAll);
  const [searchText, setSearchTextState] = useState(filters.search);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Functional updates, so a debounced search never writes back filters it read before a later change.
  const setFilters = (patch: Partial<RepairListFilterValues>) =>
    setSearchParams(
      (current) => {
        const state = readListState(current, seesAll);
        const next = { ...state.filters, ...patch };
        const keys = Object.keys(patch) as (keyof RepairListFilterValues)[];
        return keys.some((k) => next[k] !== state.filters[k]) ? writeListState(next, 1) : current;
      },
      { replace: true },
    );

  const setPage = (nextPage: number) =>
    setSearchParams((current) => writeListState(readListState(current, seesAll).filters, nextPage), { replace: true });

  const setSearchText = (text: string) => {
    setSearchTextState(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFilters({ search: text.trim() }), SEARCH_DELAY_MS);
  };

  const clearFilters = () => {
    window.clearTimeout(timer.current);
    setSearchTextState('');
    setSearchParams(writeListState(DEFAULT_REPAIR_LIST_FILTERS, 1), { replace: true });
  };

  return { filters, page, searchText, setSearchText, setFilters, setPage, clearFilters };
}
