import type { ReactNode } from 'react';

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

export type RowAction = { label: string; onSelect: () => void; destructive?: boolean };

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
  empty: { title: string; description?: string; action?: ReactNode };
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => RowAction[];
  pagination?: PaginationState;
  /** Accessible name of the table, such as "Repair tickets". */
  label?: string;
};

export function lastPage(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize));
}
