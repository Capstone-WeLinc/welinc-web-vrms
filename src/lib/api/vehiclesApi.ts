import api from './axios';

/**
 * One row of Settings > Vehicles (vehicle.manage, spec 0016, AC-21). Read only since spec 0029
 * (AC-4): VMMS owns the trucks and VRMS's fleet sync copies them.
 */
export interface ManagedVehicle {
  id: string;
  plateNumber: string;
  model: string;
  make: string | null;
  /** VMMS's size, such as "6 wheeler". */
  truckSizeCategory: string | null;
  status: string;
  type: { id: string; name: string } | null;
  garage: { id: string; name: string } | null;
  /** When the fleet sync last wrote this truck; null before the first sync. */
  syncedAt: string | null;
  updatedAt: string;
  /** Spec 0020, AC-8: the truck's newest open ticket. */
  openTicket: { id: string; repairNumber: string } | null;
}

export async function getManagedVehicles(): Promise<ManagedVehicle[]> {
  const response = await api.get<ManagedVehicle[]>('/vrms/vehicles', { quiet: true });
  return response.data;
}

/**
 * One row of a truck's history (spec 0020, AC-9). Status rows hold the status as a string; type
 * and garage rows hold `{ id, name }` or null. `ticket` is set on rows a ticket create or release
 * wrote (before spec 0029). Rows by `VMMS` come from the fleet sync (spec 0029, AC-3).
 */
export interface VehicleChange {
  id: string;
  field: 'status' | 'vehicleType' | string;
  before: unknown;
  after: unknown;
  note: string | null;
  actorName: string | null;
  createdAt: string;
  ticket: { id: string; repairNumber: string } | null;
}

export interface VehicleChangesPage {
  items: VehicleChange[];
  nextCursor: string | null;
}

/** Newest first, 20 a page; pass the previous page's nextCursor for the next one. */
export async function getVehicleChanges(id: string, cursor?: string): Promise<VehicleChangesPage> {
  const response = await api.get<VehicleChangesPage>(`/vrms/vehicles/${id}/changes`, {
    params: cursor ? { cursor } : undefined,
    quiet: true,
  });
  return response.data;
}
