import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

// Shaped like TanStack ColumnDef so a later swap is cheap.
export type Column<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Where the column goes on phone cards. Default 'field'. */
  mobile?: 'title' | 'subtitle' | 'badge' | 'field' | 'hidden';
  /** 'end' for money and counts (tabular-nums). */
  align?: 'start' | 'end';
};

export type RowAction = {
  label: string;
  onSelect?: () => void;
  destructive?: boolean;
  /** Shown but not selectable; say why in `hint`. */
  disabled?: boolean;
  /** A short line under the label, such as why the action is off. */
  hint?: string;
  /** Makes the item a link to this app path instead of calling onSelect. */
  href?: string;
  /** Makes the item a link to another app (the portal), opened in a new tab. */
  externalHref?: string;
};

export type PaginationState = {
  /** 1 based. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  state: 'loading' | 'error' | 'ready';
  onRetry?: () => void;
  /** Shown in the ErrorState, usually from getApiErrorMessage. */
  errorMessage?: string;
  empty: { title: string; description?: string; icon?: LucideIcon; action?: ReactNode };
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => RowAction[];
  /** Accessible name of a row's actions trigger, such as "Actions for Juan". Default "Row actions". */
  rowActionsLabel?: (row: T) => string;
  pagination?: PaginationState;
  /** Accessible name of the table, such as "Repair tickets". */
  label?: string;
  /**
   * Splits rows (already sorted) into runs that share a key: a full width heading row on desktop,
   * a heading between cards on phones. Only consecutive rows are merged.
   */
  groupBy?: (row: T) => { key: string; label: string };
};

export type RowGroup<T> = { key: string; label: string | null; rows: T[] };

/** Consecutive runs of rows with the same group key; one unlabelled group when there is no groupBy. */
export function groupRows<T>(rows: T[], groupBy?: DataTableProps<T>['groupBy']): RowGroup<T>[] {
  if (!groupBy) return [{ key: 'all', label: null, rows }];
  const groups: RowGroup<T>[] = [];
  for (const row of rows) {
    const { key, label } = groupBy(row);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.rows.push(row);
    else groups.push({ key, label, rows: [row] });
  }
  return groups;
}

export function lastPage(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize));
}
