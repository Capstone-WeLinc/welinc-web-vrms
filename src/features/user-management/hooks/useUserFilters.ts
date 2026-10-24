import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_USER_FILTERS, readUserListState, writeUserListState, type UserFilterValues } from '../lib/userFilters';

const SEARCH_DELAY_MS = 300;

/**
 * The Users page filters and page, read from and written to the URL (spec 0006, AC-4). Every
 * change replaces the history entry and goes back to page 1. The search box text is local and
 * reaches the URL 300ms after typing stops.
 *
 * `isBlocked` reports an open dialog or confirm(): ConfirmProvider answers every open prompt
 * "no" on any URL change, so a debounced write waits until it returns false.
 */
export function useUserFilters(isBlocked: () => boolean) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { filters, page } = readUserListState(searchParams);
  const [searchText, setSearchTextState] = useState(filters.search);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Functional updates, so a debounced search never writes back filters it read before a later change.
  const setFilters = (patch: Partial<UserFilterValues>) =>
    setSearchParams(
      (current) => {
        const state = readUserListState(current);
        const next = { ...state.filters, ...patch };
        const keys = Object.keys(patch) as (keyof UserFilterValues)[];
        return keys.some((k) => next[k] !== state.filters[k]) ? writeUserListState(next, 1) : current;
      },
      { replace: true },
    );

  const setPage = (nextPage: number) =>
    setSearchParams((current) => writeUserListState(readUserListState(current).filters, nextPage), { replace: true });

  const setSearchText = (text: string) => {
    setSearchTextState(text);
    window.clearTimeout(timer.current);
    const write = () => {
      if (isBlocked()) timer.current = window.setTimeout(write, SEARCH_DELAY_MS);
      else setFilters({ search: text.trim() });
    };
    timer.current = window.setTimeout(write, SEARCH_DELAY_MS);
  };

  const clearFilters = () => {
    window.clearTimeout(timer.current);
    setSearchTextState('');
    setSearchParams(writeUserListState(DEFAULT_USER_FILTERS, 1), { replace: true });
  };

  return { filters, page, searchText, setSearchText, setFilters, setPage, clearFilters };
}
