import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_MECHANICS_FILTERS, readMechanicsFilters, writeMechanicsFilters, type MechanicsFilters } from '../lib/mechanicsList';

const SEARCH_DELAY_MS = 300;

/**
 * Spec 0022, AC-7: the Work filter and name search in `?work=` and `?q=`, the same debounce as the
 * Users page. Each change replaces the history entry.
 */
export function useMechanicsFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readMechanicsFilters(searchParams);
  const [searchText, setSearchTextState] = useState(filters.search);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const setFilters = (patch: Partial<MechanicsFilters>) =>
    setSearchParams((current) => writeMechanicsFilters({ ...readMechanicsFilters(current), ...patch }), { replace: true });

  const setSearchText = (text: string) => {
    setSearchTextState(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFilters({ search: text.trim() }), SEARCH_DELAY_MS);
  };

  const clearFilters = () => {
    window.clearTimeout(timer.current);
    setSearchTextState('');
    setSearchParams(writeMechanicsFilters(DEFAULT_MECHANICS_FILTERS), { replace: true });
  };

  return { filters, searchText, setSearchText, setFilters, clearFilters };
}
