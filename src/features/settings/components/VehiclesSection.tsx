import { useMemo, useState } from 'react';
import { Truck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '../../../components/shared/data-table/DataTable';
import type { Column } from '../../../components/shared/data-table/types';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { useToast } from '../../../context/toast';
import { getApiErrorMessage, getApiErrorStatus } from '../../../lib/api/errors';
import { getManagedVehicles, setVehicleType, type ManagedVehicle } from '../../../lib/api/vehiclesApi';
import { getLookup, type LookupOption } from '../../../lib/api/vrmsConfigApi';
import { useLoad } from '../../knowledge-base/hooks/useLoad';

const NONE = '__none';
const STALE_MESSAGE = 'This truck changed. Check the type and save again.';

const fetchVehicles = () => getManagedVehicles();
const fetchTypes = () => getLookup('vehicle_type');

/**
 * Spec 0016, AC-21: every active truck with a type select. A save that meets a truck changed
 * since the list loaded (a new ticket bumps it) reloads the list and asks the Admin to check.
 */
export function VehiclesSection() {
  const { showToast } = useToast();
  const vehicles = useLoad('vehicles', fetchVehicles, 'Vehicles didn’t load.');
  const types = useLoad('vehicle_type', fetchTypes, 'Vehicle types didn’t load.');
  const [saving, setSaving] = useState<string | null>(null);
  const rows = vehicles.data ?? [];
  const options: LookupOption[] = types.data ?? [];

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
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(v) => v.id}
      state={vehicles.state}
      onRetry={vehicles.retry}
      errorMessage={vehicles.errorMessage}
      label="Vehicles"
      empty={{ title: 'No vehicles yet.', description: 'Vehicles come from the fleet records.', icon: Truck }}
    />
  );
}
