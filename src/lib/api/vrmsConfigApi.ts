import api from './axios';

export interface GarageOption {
  id: string;
  name: string;
}

export interface VehicleOption {
  id: string;
  plateNumber: string;
  model: string;
  status: string;
}

export interface MechanicOption {
  id: string;
  name: string;
  isAvailable: boolean;
}

export async function getGarages(): Promise<GarageOption[]> {
  const response = await api.get<GarageOption[]>('/vrms/config/garages');
  return response.data;
}

export async function getVehicles(): Promise<VehicleOption[]> {
  const response = await api.get<VehicleOption[]>('/vrms/config/vehicles');
  return response.data;
}

export async function getAvailableMechanics(): Promise<MechanicOption[]> {
  const response = await api.get<MechanicOption[]>('/vrms/mechanics/available');
  return response.data;
}
