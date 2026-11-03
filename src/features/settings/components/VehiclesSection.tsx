import { useMemo, useRef, useState } from 'react';
import { Search, Truck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '../../../components/shared/data-table/DataTable';
import type { Column, RowAction } from '../../../components/shared/data-table/types';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { statusLabel } from '../../../components/shared/statusLabels';
import { useToast } from '../../../context/toast';
import { getApiErrorMessage, getApiErrorStatus, getConflictCode } from '../../../lib/api/errors';
import { getManagedVehicles, setVehicleStatus, setVehicleType, type ManagedVehicle } from '../../../lib/api/vehiclesApi';
import { getLookup, type LookupOption } from '../../../lib/api/vrmsConfigApi';
import { useLoad } from '../../knowledge-base/hooks/useLoad';
import { TicketNoteDialog } from '../../repair/components/TicketNoteDialog';
import { REASON_MIN, statusActions, type StatusAction } from '../lib/vehicleStatus';

const NONE = '__none';
const PAGE_SIZE = 25;
const STALE_MESSAGE = 'This truck changed. Check the type and save again.';
// Spec 0020, AC-5: the status toggle's own stale message
const STALE_STATUS_MESSAGE = 'This truck changed. Reload and try again.';

type StatusDialog = { vehicle: ManagedVehicle; action: StatusAction; key: number };

const fetchVehicles = () => getManagedVehicles();
const fetchTypes = () => getLookup('vehicle_type');

/**
 * Spec 0016, AC-21: every active truck with a type select. A save that meets a truck changed
 * since the list loaded (a new ticket bumps it) reloads the list and asks the Admin to check.
 * Spec 0020: a row menu sets the truck Available or Disabled with a reason.
 */
export function VehiclesSection() {
  const { showToast } = useToast();
  const vehicles = useLoad('vehicles', fetchVehicles, 'Vehicles didn’t load.');
  const types = useLoad('vehicle_type', fetchTypes, 'Vehicle types didn’t load.');
  const [saving, setSaving] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [statusDialog, setStatusDialog] = useState<StatusDialog | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  // The row menu trigger of the truck being changed, so focus goes back to it (AC-11)
  const menuTrigger = useRef<HTMLElement | null>(null);
  const rows = useMemo(() => vehicles.data ?? [], [vehicles.data]);
  const options: LookupOption[] = types.data ?? [];
  const needle = query.trim().toLowerCase();
  const matching = useMemo(
    () => (needle ? rows.filter((v) => `${v.plateNumber} ${v.model} ${v.type?.name ?? ''}`.toLowerCase().includes(needle)) : rows),
    [rows, needle],
  );
  const lastPage = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const currentPage = Math.min(page, lastPage);
  const shown = matching.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const change = async (vehicle: ManagedVehicle, value: string) => {
    setSaving(vehicle.id);
    try {
      const saved = await setVehicleType(vehicle.id, value === NONE ? null : value, vehicle.updatedAt);
      vehicles.replace(rows.map((r) => (r.id === saved.id ? saved : r)));
      showToast(`${vehicle.plateNumber} type saved.`, 'success');
    } catch (err) {
      if (getApiErrorStatus(err) === 409) {
        showToast(STALE_MESSAGE, 'error');
        await vehicles.refresh();
      } else {
        showToast(getApiErrorMessage(err, 'Couldn’t save the vehicle type.'), 'error');
      }
    } finally {
      setSaving(null);
    }
  };

  const openStatus = (vehicle: ManagedVehicle, action: StatusAction) => {
    menuTrigger.current = document.querySelector<HTMLElement>(`[data-row-actions="${vehicle.id}"]`);
    setStatusDialog({ vehicle, action, key: Date.now() });
    setStatusOpen(true);
  };

  // Spec 0020, AC-11: resolve to close the dialog; throw to show the message in it (reason kept)
  const saveStatus = async (reason: string) => {
    if (!statusDialog) return;
    const { vehicle, action } = statusDialog;
    try {
      const saved = await setVehicleStatus(vehicle.id, action.target, reason, vehicle.updatedAt);
      vehicles.replace(rows.map((r) => (r.id === saved.id ? saved : r)));
      setStatusOpen(false);
      showToast(`${vehicle.plateNumber} is now ${statusLabel(saved.status)}.`, 'success');
    } catch (err) {
      const code = getConflictCode(err);
      if (code === 'STALE_VEHICLE') {
        setStatusOpen(false);
        showToast(STALE_STATUS_MESSAGE, 'error');
        await vehicles.refresh();
        return;
      }
      if (code === 'OPEN_TICKET_EXISTS' || code === 'VEHICLE_STATUS_LOCKED') void vehicles.refresh();
      throw err;
    }
  };

  const rowActions = (vehicle: ManagedVehicle): RowAction[] =>
    statusActions(vehicle).map((action) => ({
      label: action.label,
      destructive: action.destructive,
      onSelect: () => openStatus(vehicle, action),
    }));

  const columns = useMemo<Column<ManagedVehicle>[]>(
    () => [
      { id: 'plate', header: 'Plate', mobile: 'title', cell: (v) => <span className="font-medium">{v.plateNumber}</span> },
      { id: 'model', header: 'Model', mobile: 'subtitle', cell: (v) => <span className="text-muted-foreground">{v.model}</span> },
      { id: 'status', header: 'Status', mobile: 'badge', cell: (v) => <StatusBadge status={v.status} /> },
      {
        id: 'type',
        header: 'Type',
        cell: (v) => {
          // Keep a type that was deactivated visible, so the select still shows what the truck has
          const stale = v.type && !options.some((o) => o.id === v.type!.id) ? v.type : null;
          return (
            <Select value={v.type?.id ?? NONE} onValueChange={(next) => void change(v, next)} disabled={saving === v.id || types.state !== 'ready'}>
              <SelectTrigger aria-label={`Type for ${v.plateNumber}`} className="h-11 w-full min-w-40 md:h-9">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Not set</SelectItem>
                {stale && (
                  <SelectItem value={stale.id} disabled>
                    {stale.name}
                  </SelectItem>
                )}
                {options.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
      },
    ],
    // `change` closes over the current rows and the saving id
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options, saving, types.state, rows],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Search vehicles"
          placeholder="Search plate, model or type"
          className="pl-9"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <DataTable
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
          title: needle ? 'No vehicle matches.' : 'No vehicles yet.',
          description: needle ? 'Try another plate, model or type.' : 'Vehicles come from the fleet records.',
          icon: Truck,
        }}
      />
      {statusDialog && (
        <TicketNoteDialog
          key={statusDialog.key}
          open={statusOpen}
          onOpenChange={setStatusOpen}
          title={statusDialog.action.title(statusDialog.vehicle.plateNumber)}
          description={
            statusDialog.action.target === 'DISABLED'
              ? 'Nobody should dispatch or plan around it until it is made available again.'
              : 'It rejoins the fleet and can be dispatched again.'
          }
          fieldLabel="Reason"
          requiredMessage={`Give a reason of ${REASON_MIN} to 500 characters.`}
          minLength={REASON_MIN}
          confirmLabel={statusDialog.action.label}
          destructive={statusDialog.action.destructive}
          finalFocusRef={menuTrigger}
          onSubmit={saveStatus}
        />
      )}
    </div>
  );
}
