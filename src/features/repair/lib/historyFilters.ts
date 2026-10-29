import { ALL_TIME, type DateRangeValue, type ResolvedRange } from '../../../components/shared/date-range/dateRange';
import type { RepairHistoryParams } from '../../../lib/api/repairApi';

export type Outcome = 'all' | 'CLOSED' | 'CANCELLED';

export type HistoryFilterValues = {
  search: string;
  outcome: Outcome;
  /** A garage id, or 'all'. */
  garageId: string;
  range: DateRangeValue;
};

export const DEFAULT_HISTORY_FILTERS: HistoryFilterValues = {
  search: '',
  outcome: 'all',
  garageId: 'all',
  range: ALL_TIME,
};

export const HISTORY_PAGE_SIZE = 20;

export function hasActiveFilters(filters: HistoryFilterValues) {
  return (
    filters.search.trim() !== '' ||
    filters.outcome !== 'all' ||
    filters.garageId !== 'all' ||
    filters.range.preset !== 'all'
  );
}

/** The request for these filters, or null while a Custom range is unfinished or invalid. */
export function historyParams(
  filters: HistoryFilterValues,
  search: string,
  range: ResolvedRange,
  page: number,
): RepairHistoryParams | null {
  if (range.status !== 'ready') return null;
  return {
    search: search.trim() || undefined,
    status: filters.outcome === 'all' ? undefined : filters.outcome,
    garageId: filters.garageId === 'all' ? undefined : filters.garageId,
    from: range.from,
    to: range.to,
    page,
    limit: HISTORY_PAGE_SIZE,
  };
}
