import { useMemo, useRef, useState } from 'react';
import { Search, Truck } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control';
import { DataTable } from '../../../components/shared/data-table/DataTable';
import type { Column, RowAction } from '../../../components/shared/data-table/types';
import { PlateChip } from '../../../components/shared/PlateChip';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { statusLabel } from '../../../components/shared/statusLabels';
import { getManagedVehicles, type ManagedVehicle } from '../../../lib/api/vehiclesApi';
import { formatDateTime, formatRelativeTime } from '../../../lib/utils/format';
import { useLoad } from '../../knowledge-base/hooks/useLoad';
import { VehicleHistoryDialog } from './VehicleHistoryDialog';
import { chipCounts, filterVehicles, lastSynced, makeAndModel, readStatusChip, STATUS_CHIPS, type StatusChip } from '../lib/vehicleStatus';

const PAGE_SIZE = 25;
const NONE = <span className="text-muted-foreground">—</span>;

const fetchVehicles = () => getManagedVehicles();

/**
 * Spec 0016, AC-21, read only since spec 0029 (AC-4): VMMS owns the trucks and VRMS keeps a copy,
 * so this list shows them with no edits. Status chips (kept in ?status=) and the search narrow it;
 * each row keeps its History, now fed by the fleet sync.
 */
export function VehiclesSection() {
  const vehicles = useLoad('vehicles', fetchVehicles, 'Vehicles didn’t load.');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const chip = readStatusChip(searchParams.get('status'));
  const [history, setHistory] = useState<{ vehicle: ManagedVehicle; key: number } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  // The row menu trigger of the truck whose history is open, so focus goes back to it
  const menuTrigger = useRef<HTMLElement | null>(null);
  const rows = useMemo(() => vehicles.data ?? [], [vehicles.data]);
  const needle = query.trim().toLowerCase();
  const matching = useMemo(() => filterVehicles(rows, chip, needle), [rows, chip, needle]);
  const counts = useMemo(() => chipCounts(rows, needle), [rows, needle]);
  const synced = useMemo(() => lastSynced(rows), [rows]);
  const filtered = needle !== '' || chip !== 'ALL';

  // All drops the param; a new chip goes back to page 1
  const changeChip = (next: StatusChip) => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (next === 'ALL') params.delete('status');
        else params.set('status', next);
        return params;
      },
      { replace: true },
    );
    setPage(1);
  };
  const lastPage = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const currentPage = Math.min(page, lastPage);
  const shown = matching.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openHistory = (vehicle: ManagedVehicle) => {
    menuTrigger.current = document.querySelector<HTMLElement>(`[data-row-actions="${vehicle.id}"]`);
    setHistory({ vehicle, key: Date.now() });
    setHistoryOpen(true);
  };

  const rowActions = (vehicle: ManagedVehicle): RowAction[] => [
    { label: 'History', onSelect: () => openHistory(vehicle) },
    ...(vehicle.openTicket ? [{ label: `Open ${vehicle.openTicket.repairNumber}`, href: `/repairs/${vehicle.openTicket.id}` }] : []),
  ];

  const columns = useMemo<Column<ManagedVehicle>[]>(
    () => [
      {
        id: 'truck',
        header: 'Truck',
        mobile: 'title',
        cell: (v) => (
          <div className="flex flex-col items-start gap-1">
            <PlateChip plate={v.plateNumber} />
            <span className="text-caption text-muted-foreground">{makeAndModel(v)}</span>
          </div>
        ),
      },
      { id: 'size', header: 'Size', cell: (v) => v.truckSizeCategory ?? NONE },
      { id: 'garage', header: 'Garage', mobile: 'subtitle', cell: (v) => v.garage?.name ?? NONE },
      { id: 'status', header: 'Status', mobile: 'badge', cell: (v) => <StatusBadge status={v.status} /> },
      {
        id: 'ticket',
        header: 'Open ticket',
        cell: (v) =>
          v.openTicket ? (
            <Link to={`/repairs/${v.openTicket.id}`} className="font-mono text-caption whitespace-nowrap text-primary underline-offset-4 hover:underline">
              {v.openTicket.repairNumber}
            </Link>
          ) : (
            NONE
          ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Spec 0029, AC-4: say who owns these rows and how fresh the copy is */}
      <p className="text-small text-muted-foreground">
        Managed in VMMS. To add or change a truck, ask VMMS Operations.
        {synced && (
          <>
            {' '}
            Last update from VMMS <time dateTime={synced} title={formatDateTime(synced)}>{formatRelativeTime(synced)}</time>.
          </>
        )}
      </p>
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search vehicles"
            name="vehicle-search"
            autoComplete="off"
            placeholder="Search plate, model, size or garage"
            className="pl-9"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {/* Scrolls sideways on a phone instead of wrapping */}
        {/* Vertical padding keeps the focus ring of the first and last chip from being clipped; the right fade (phones only) says more chips are off screen */}
        <div className="-mx-4 -my-1 overflow-x-auto mask-r-from-95% px-4 py-1 md:mx-0 md:px-0 md:mask-none">
          <SegmentedControl aria-label="Status" value={chip} onValueChange={(next) => changeChip(next as StatusChip)}>
            {STATUS_CHIPS.map((value) => (
              <SegmentedControlItem key={value} value={value}>
                {value === 'ALL' ? 'All' : statusLabel(value)}
                {vehicles.state === 'ready' && <span className="font-mono text-caption">{counts[value].toLocaleString()}</span>}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </div>
      </div>
      <DataTable
        errorKind="page"
        columns={columns}
        rows={shown}
        getRowId={(v) => v.id}
        state={vehicles.state}
        onRetry={vehicles.retry}
        errorMessage={vehicles.errorMessage}
        label="Vehicles"
        rowActions={rowActions}
        rowActionsLabel={(v) => `Actions for ${v.plateNumber}`}
        pagination={{ page: currentPage, pageSize: PAGE_SIZE, total: matching.length, onPageChange: setPage }}
        empty={{
          title: filtered ? 'No vehicle matches.' : 'No trucks from VMMS yet.',
          description: filtered ? 'Try another search or status.' : 'Trucks appear here once VMMS Operations adds them.',
          icon: Truck,
        }}
      />
      {history && (
        <VehicleHistoryDialog
          key={history.key}
          vehicle={history.vehicle}
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          finalFocusRef={menuTrigger}
        />
      )}
    </div>
  );
}
