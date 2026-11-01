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
}

export async function getManagedVehicles(): Promise<ManagedVehicle[]> {
  const response = await api.get<ManagedVehicle[]>('/vrms/vehicles', { quiet: true });
  return response.data;
}

export async function setVehicleType(id: string, vehicleTypeId: string | null, updatedAt: string): Promise<ManagedVehicle> {
  const response = await api.patch<ManagedVehicle>(`/vrms/vehicles/${id}`, { vehicleTypeId, updatedAt }, { quiet: true });
  return response.data;
}
