import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, History, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PageHeader } from '../../../components/layout/PageHeader';
import { BadgePill } from '../../../components/shared/BadgePill';
import { DataTable } from '../../../components/shared/data-table/DataTable';
import type { Column, RowAction } from '../../../components/shared/data-table/types';
import { ErrorState } from '../../../components/shared/ErrorState';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { resolveRange } from '../../../components/shared/date-range/dateRange';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { getGarages, type GarageOption } from '../../../lib/api/vrmsConfigApi';
import { formatDuration, formatMonthHeading, formatPeso, formatShortDate, monthKey } from '../../../lib/utils/format';
import { useAuthStore } from '../../../store/authStore';
import type { RepairHistoryRow } from '../../../types';
import { HistoryFilters } from '../components/HistoryFilters';
import { HistorySummary } from '../components/HistorySummary';
import { useRepairHistory } from '../hooks/useRepairHistory';
import {
  DEFAULT_HISTORY_FILTERS,
  HISTORY_PAGE_SIZE,
  hasActiveFilters,
  historyParams,
  type HistoryFilterValues,
} from '../lib/historyFilters';

function RepairNumberCell({ row }: { row: RepairHistoryRow }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 font-medium md:flex-nowrap md:whitespace-nowrap">
      {/* Beside the outcome badge on a 375px card the number wraps once, at a hyphen. */}
      <span className="text-sm">{row.repairNumber}</span>
      {row.isUnlocked ? (
        <BadgePill className="bg-highlight text-highlight-foreground">Unlocked</BadgePill>
      ) : (
        <Lock role="img" aria-label="Locked" className="size-4 text-muted-foreground" />
      )}
    </span>
  );
}

function OutcomeCell({ row }: { row: RepairHistoryRow }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <StatusBadge status={row.status} />
      {row.status === 'CANCELLED' && row.cancellationReason && (
        <Tooltip>
          <TooltipTrigger asChild>
            {/* Focusable so keyboard users can read the full reason too. */}
            <span tabIndex={0} className="block max-w-48 truncate rounded-sm text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {row.cancellationReason}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{row.cancellationReason}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function historyColumns(isAdmin: boolean): Column<RepairHistoryRow>[] {
  const columns: Column<RepairHistoryRow>[] = [
    { id: 'repair', header: 'Repair #', mobile: 'title', cell: (row) => <RepairNumberCell row={row} /> },
    {
      id: 'vehicle',
      header: 'Vehicle',
      mobile: 'subtitle',
      cell: (row) => <span className="whitespace-nowrap">{row.vehiclePlate}</span>,
    },
    { id: 'outcome', header: 'Outcome', mobile: 'badge', cell: (row) => <OutcomeCell row={row} /> },
    {
      id: 'duration',
      header: 'Duration',
      cell: (row) => (
        <span className="whitespace-nowrap">
          {row.status === 'CLOSED' && row.closedAt ? formatDuration(row.createdAt, row.closedAt) : '—'}
        </span>
      ),
    },
    { id: 'garage', header: 'Garage', cell: (row) => row.garageLocation ?? '—' },
  ];
  if (isAdmin) {
    columns.push({
      id: 'cost',
      header: 'Cost',
      align: 'end',
      cell: (row) => (row.totalCost == null ? '—' : formatPeso(row.totalCost)),
    });
  }
  columns.push({
    id: 'closed',
    header: 'Closed',
    cell: (row) =>
      row.closedAt ? (
        <time dateTime={row.closedAt} className="whitespace-nowrap">
          {formatShortDate(row.closedAt)}
        </time>
      ) : (
        '—'
      ),
  });
  return columns;
}

export function HistoryPage() {
  const isAdmin = useAuthStore((state) => state.user?.role === 'ADMIN');
  const navigate = useNavigate();
  const [filters, setFilters] = useState<HistoryFilterValues>(DEFAULT_HISTORY_FILTERS);
  const [page, setPage] = useState(1);
  const [garages, setGarages] = useState<GarageOption[]>([]);
  const search = useDebouncedValue(filters.search);

  const range = resolveRange(filters.range);
  const history = useRepairHistory(historyParams(filters, search, range, page));

  useEffect(() => {
    let cancelled = false;
    // Without garages the filter keeps only "All garages"; the page still works.
    getGarages()
      .then((list) => {
        if (!cancelled) setGarages(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const changeFilters = (next: HistoryFilterValues) => {
    setFilters(next);
    setPage(1);
  };

  const rowActions = (row: RepairHistoryRow): RowAction[] => [
    { label: 'View details', onSelect: () => navigate(`/repairs/${row.id}?mode=readonly`) },
    ...(isAdmin ? [{ label: 'Edit ticket', onSelect: () => navigate(`/repairs/${row.id}`) }] : []),
  ];

  const filtered = hasActiveFilters(filters);

  return (
    <div>
      <PageHeader title="Repair history" subtitle="Finished repairs, closed and cancelled." icon={History} />

      <HistoryFilters
        value={filters}
        garages={garages}
        rangeError={range.status === 'invalid' ? range.error : undefined}
        onChange={changeFilters}
      />

      {history.state === 'error' ? (
        <div className="rounded-xl border border-border bg-card shadow-xs">
          <ErrorState
            title="We couldn’t load repair history"
            message={history.errorMessage ?? 'Repair history didn’t load.'}
            onRetry={history.retry}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <HistorySummary summary={history.state === 'ready' ? history.summary : null} showSpend={isAdmin} />
          <DataTable
            columns={historyColumns(isAdmin)}
            rows={history.rows}
            getRowId={(row) => row.id}
            state={history.state}
            label="Closed repairs"
            groupBy={(row) =>
              row.closedAt
                ? { key: monthKey(row.closedAt), label: formatMonthHeading(row.closedAt) }
                : { key: 'none', label: 'No close date' }
            }
            onRowClick={(row) => navigate(`/repairs/${row.id}?mode=readonly`)}
            rowActions={rowActions}
            pagination={{ page, pageSize: HISTORY_PAGE_SIZE, total: history.total, onPageChange: setPage }}
            empty={
              filtered
                ? {
                    title: 'No repairs match these filters',
                    description: 'Try a wider date range or another outcome or garage.',
                    icon: Archive,
                    action: (
                      <Button variant="outline" onClick={() => changeFilters(DEFAULT_HISTORY_FILTERS)}>
                        Clear filters
                      </Button>
                    ),
                  }
                : {
                    title: 'No closed repairs yet',
                    description: 'Closed and cancelled repairs show up here.',
                    icon: Archive,
                  }
            }
          />
        </div>
      )}
    </div>
  );
}
