import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REPAIR_LIST_FILTERS,
  hasActiveFilters,
  readListState,
  repairListParams,
  writeListState,
} from './repairListFilters';

// covers: AC-35 (spec 0029): the "Truck removed in VMMS only" switch lives in the URL as
// `?removed=1`, and the dashboard card links to it.

describe('the truck removed filter in the list URL (AC-35)', () => {
  it('reads removed=1 as on, and anything else as off', () => {
    expect(readListState(new URLSearchParams('removed=1'), true).filters.truckRemoved).toBe(true);
    expect(readListState(new URLSearchParams('removed=0'), true).filters.truckRemoved).toBe(false);
    expect(readListState(new URLSearchParams('removed=true'), true).filters.truckRemoved).toBe(false);
    expect(readListState(new URLSearchParams(''), true).filters.truckRemoved).toBe(false);
  });

  it('writes removed=1 only when on, and leaves the default out of the URL', () => {
    expect(writeListState({ ...DEFAULT_REPAIR_LIST_FILTERS, truckRemoved: true }, 1).toString()).toBe(
      'removed=1',
    );
    expect(writeListState(DEFAULT_REPAIR_LIST_FILTERS, 1).toString()).toBe('');
  });

  it('survives a write then a read, beside other filters and a page', () => {
    const filters = { ...DEFAULT_REPAIR_LIST_FILTERS, truckRemoved: true, overdue: true };
    const back = readListState(writeListState(filters, 3), true);
    expect(back.filters).toEqual(filters);
    expect(back.page).toBe(3);
  });

  it('counts as an active filter, so the empty state offers to clear it', () => {
    expect(hasActiveFilters(DEFAULT_REPAIR_LIST_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_REPAIR_LIST_FILTERS, truckRemoved: true })).toBe(true);
  });

  it('sends truckRemoved to the server only when on', () => {
    expect(repairListParams({ ...DEFAULT_REPAIR_LIST_FILTERS, truckRemoved: true }, 1).truckRemoved).toBe(true);
    expect(repairListParams(DEFAULT_REPAIR_LIST_FILTERS, 1).truckRemoved).toBeUndefined();
  });
});
