// Spec 0003 date presets. Every boundary is local midnight built with calendar math
// (new Date(y, m, d)), never "plus 24 hours", so daylight saving never shifts one.

export type DatePreset = 'all' | 'month' | '90d' | 'year' | 'custom';

export type DateRangeValue = {
  preset: DatePreset;
  /** `YYYY-MM-DD` from the date input, only read for Custom. Inclusive. */
  from: string;
  /** `YYYY-MM-DD`, inclusive. */
  to: string;
};

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'month', label: 'This month' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom' },
];

export const ALL_TIME: DateRangeValue = { preset: 'all', from: '', to: '' };

export const RANGE_ORDER_ERROR = 'Start date must be on or before the end date.';

export type ResolvedRange =
  /** Send these (both absent for All time). */
  | { status: 'ready'; from?: string; to?: string }
  /** Custom with a date missing: send nothing yet. */
  | { status: 'incomplete' }
  /** Custom with from after to: show the error, send nothing. */
  | { status: 'invalid'; error: string };

function parseDay(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

/** Turns a range into the `from` (inclusive) and `to` (exclusive) ISO instants the API takes. */
export function resolveRange(value: DateRangeValue, now: Date = new Date()): ResolvedRange {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const span = (from: Date, to: Date): ResolvedRange => ({
    status: 'ready',
    from: from.toISOString(),
    to: to.toISOString(),
  });

  switch (value.preset) {
    case 'all':
      return { status: 'ready' };
    case 'month':
      return span(new Date(y, m, 1), new Date(y, m + 1, 1));
    case '90d':
      return span(new Date(y, m, d - 89), new Date(y, m, d + 1));
    case 'year':
      return span(new Date(y, 0, 1), new Date(y + 1, 0, 1));
    case 'custom': {
      const from = parseDay(value.from);
      const to = parseDay(value.to);
      if (!from || !to) return { status: 'incomplete' };
      if (from > to) return { status: 'invalid', error: RANGE_ORDER_ERROR };
      return span(from, new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1));
    }
  }
}
