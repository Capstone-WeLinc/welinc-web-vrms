import type { KeyboardEvent } from 'react';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import { EmptyState } from '../EmptyState';
import { ErrorState } from '../ErrorState';
import { Pagination } from './Pagination';
import type { Column, DataTableProps, RowAction } from './types';

const SKELETON_ROWS = 5;

function RowActionsMenu({ actions, touch }: { actions: RowAction[]; touch: boolean }) {
  if (actions.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={touch ? 'icon-touch' : 'icon'}
          aria-label="Row actions"
          // The row or card may be clickable; opening the menu must not trigger it.
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuGroup>
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.label}
              variant={action.destructive ? 'destructive' : 'default'}
              onSelect={action.onSelect}
            >
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DesktopTable<T>({ columns, rows, getRowId, state, onRowClick, rowActions, pagination, label }: DataTableProps<T>) {
  const skeletonCount = Math.min(pagination?.pageSize ?? SKELETON_ROWS, 10);
  const alignClass = (column: Column<T>) => (column.align === 'end' ? 'text-right tabular-nums' : 'text-left');

  const onRowKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRowClick?.(row);
    }
  };

  return (
    <Table aria-label={label} aria-busy={state === 'loading' || undefined}>
      <TableHeader className="bg-muted">
        <TableRow>
          {columns.map((column) => (
            <TableHead
              key={column.id}
              className={cn('h-10 px-4 text-xs font-medium tracking-wide text-muted-strong uppercase', alignClass(column))}
            >
              {column.header}
            </TableHead>
          ))}
          {rowActions && (
            <TableHead className="w-14 px-4">
              <span className="sr-only">Actions</span>
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {state === 'loading'
          ? Array.from({ length: skeletonCount }, (_, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column.id} className="h-14 px-4">
                    <Skeleton className={cn('h-4', column.align === 'end' ? 'ml-auto w-16' : 'w-3/4')} />
                  </TableCell>
                ))}
                {rowActions && <TableCell className="px-4" />}
              </TableRow>
            ))
          : rows.map((row) => (
              <TableRow
                key={getRowId(row)}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => onRowKeyDown(e, row) : undefined}
                className={cn(
                  onRowClick &&
                    'cursor-pointer outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                )}
              >
                {columns.map((column) => (
                  <TableCell key={column.id} className={cn('h-14 px-4 whitespace-normal text-foreground', alignClass(column))}>
                    {column.cell(row)}
                  </TableCell>
                ))}
                {rowActions && (
                  <TableCell className="px-4 text-right">
                    <RowActionsMenu actions={rowActions(row)} touch={false} />
                  </TableCell>
                )}
              </TableRow>
            ))}
      </TableBody>
    </Table>
  );
}

function MobileCards<T>({ columns, rows, getRowId, state, onRowClick, rowActions, pagination, label }: DataTableProps<T>) {
  const visible = columns.filter((column) => column.mobile !== 'hidden');
  const titleColumn =
    visible.find((column) => column.mobile === 'title') ?? visible.find((column) => (column.mobile ?? 'field') === 'field');
  const subtitles = visible.filter((column) => column.mobile === 'subtitle');
  const badges = visible.filter((column) => column.mobile === 'badge');
  const fields = visible.filter((column) => (column.mobile ?? 'field') === 'field' && column !== titleColumn);

  if (state === 'loading') {
    const skeletonCount = Math.min(pagination?.pageSize ?? SKELETON_ROWS, 5);
    return (
      <ul aria-label={label} aria-busy="true" className="flex flex-col gap-3 p-3">
        {Array.from({ length: skeletonCount }, (_, index) => (
          <li key={index} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul aria-label={label} className="flex flex-col gap-3 p-3">
      {rows.map((row) => (
        <li
          key={getRowId(row)}
          className={cn(
            'relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4',
            onRowClick && 'has-[[data-row-link]:focus-visible]:ring-2 has-[[data-row-link]:focus-visible]:ring-ring active:bg-muted/50',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              {titleColumn &&
                (onRowClick ? (
                  // Stretched button: the whole card is the click target, and the menu sits above it.
                  <button
                    type="button"
                    data-row-link
                    onClick={() => onRowClick(row)}
                    className="text-left text-base font-semibold text-foreground outline-none after:absolute after:inset-0 after:rounded-xl"
                  >
                    {titleColumn.cell(row)}
                  </button>
                ) : (
                  <p className="text-base font-semibold text-foreground">{titleColumn.cell(row)}</p>
                ))}
              {subtitles.map((column) => (
                <p key={column.id} className="text-sm text-muted-foreground">
                  {column.cell(row)}
                </p>
              ))}
            </div>
            {(badges.length > 0 || rowActions) && (
              <div className="relative flex shrink-0 items-center gap-1">
                {badges.map((column) => (
                  <span key={column.id}>{column.cell(row)}</span>
                ))}
                {rowActions && <RowActionsMenu actions={rowActions(row)} touch />}
              </div>
            )}
          </div>
          {fields.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              {fields.map((column) => (
                <div key={column.id} className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-xs font-medium text-muted-foreground">{column.header}</dt>
                  <dd className={cn('text-sm text-foreground', column.align === 'end' && 'tabular-nums')}>{column.cell(row)}</dd>
                </div>
              ))}
            </dl>
          )}
        </li>
      ))}
    </ul>
  );
}

// One columns definition: a table from 768px up, stacked cards below.
export function DataTable<T>(props: DataTableProps<T>) {
  const isMobile = useIsMobile();
  const { state, rows, onRetry, errorMessage, empty, pagination } = props;

  let body;
  if (state === 'error') {
    // Previous rows stay hidden, so stale data never looks current.
    body = <ErrorState message={errorMessage ?? 'We could not load this list.'} onRetry={onRetry} />;
  } else if (state === 'ready' && rows.length === 0) {
    body = <EmptyState title={empty.title} description={empty.description} icon={empty.icon} action={empty.action} />;
  } else {
    body = isMobile ? <MobileCards {...props} /> : <DesktopTable {...props} />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      {body}
      {pagination && state !== 'error' && pagination.total > 0 && <Pagination {...pagination} />}
    </div>
  );
}
