import api from './axios';

/** One row of Settings > Vehicles (vehicle.manage, spec 0016, AC-21). */
export interface ManagedVehicle {
  id: string;
  plateNumber: string;
  model: string;
  status: string;
  type: { id: string; name: string } | null;
  /** Sent back on a save, so a truck changed meanwhile answers 409. */
  updatedAt: string;
  /** Spec 0020, AC-8: the truck's newest open ticket; while set, its status can't be toggled. */
  openTicket: { id: string; repairNumber: string } | null;
}

export async function getManagedVehicles(): Promise<ManagedVehicle[]> {
  const response = await api.get<ManagedVehicle[]>('/vrms/vehicles', { quiet: true });
  return response.data;
}

export async function setVehicleType(id: string, vehicleTypeId: string | null, updatedAt: string): Promise<ManagedVehicle> {
  const response = await api.patch<ManagedVehicle>(`/vrms/vehicles/${id}`, { vehicleTypeId, updatedAt }, { quiet: true });
  return response.data;
}

/** Spec 0020, AC-3: the only statuses an Admin may set by hand. */
export type ToggleStatus = 'AVAILABLE' | 'DISABLED';

/** Spec 0020, AC-1 and AC-2: sets a truck Available or Disabled with a reason (5 to 500). */
export async function setVehicleStatus(id: string, status: ToggleStatus, reason: string, updatedAt: string): Promise<ManagedVehicle> {
  const response = await api.post<ManagedVehicle>(`/vrms/vehicles/${id}/status`, { status, reason, updatedAt }, { quiet: true });
  return response.data;
}
