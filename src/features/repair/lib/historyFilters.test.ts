import { describe, expect, it } from 'vitest';
import { DEFAULT_HISTORY_FILTERS, HISTORY_PAGE_SIZE, hasActiveFilters, historyParams } from './historyFilters';

// Spec 0010, AC-16: the Outcome filter sends CLOSED or CANCELLED, never a retired status.

const ready = { status: 'ready' as const };

describe('hasActiveFilters', () => {
  it('is false for the defaults and for a blank search', () => {
    expect(hasActiveFilters(DEFAULT_HISTORY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_HISTORY_FILTERS, search: '   ' })).toBe(false);
  });

  it('is true when any one filter is set', () => {
    expect(hasActiveFilters({ ...DEFAULT_HISTORY_FILTERS, search: 'abc' })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_HISTORY_FILTERS, outcome: 'CANCELLED' })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_HISTORY_FILTERS, garageId: 'g1' })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_HISTORY_FILTERS, range: { preset: 'custom', from: '', to: '' } })).toBe(true);
  });
});

describe('historyParams', () => {
  it('omits the all choices and a blank search', () => {
    expect(historyParams(DEFAULT_HISTORY_FILTERS, '  ', ready, 1)).toEqual({
      search: undefined,
      status: undefined,
      garageId: undefined,
      from: undefined,
      to: undefined,
      page: 1,
      limit: HISTORY_PAGE_SIZE,
    });
  });

  it('sends the outcome as the status, the trimmed search and the range', () => {
    const params = historyParams(
      { ...DEFAULT_HISTORY_FILTERS, outcome: 'CLOSED', garageId: 'g1' },
      ' brake ',
      { status: 'ready', from: '2026-10-01T00:00:00.000Z', to: '2026-11-01T00:00:00.000Z' },
      3,
    );
    expect(params).toMatchObject({
      search: 'brake',
      status: 'CLOSED',
      garageId: 'g1',
      from: '2026-10-01T00:00:00.000Z',
      to: '2026-11-01T00:00:00.000Z',
      page: 3,
    });
  });

  it('sends nothing while the range is incomplete or invalid', () => {
    expect(historyParams(DEFAULT_HISTORY_FILTERS, '', { status: 'incomplete' }, 1)).toBeNull();
    expect(historyParams(DEFAULT_HISTORY_FILTERS, '', { status: 'invalid', error: 'x' }, 1)).toBeNull();
  });
});
