import api from './axios';
import { CreateRepairPayload, RepairStatus, RepairTicket } from '../../types';

export async function getRepairs(search?: string, status?: RepairStatus): Promise<RepairTicket[]> {
  const response = await api.get<RepairTicket[]>('/vrms/repairs', {
    params: {
      search,
      status,
    },
  });
  return response.data;
}

export async function getRepairHistory(search?: string): Promise<RepairTicket[]> {
  const response = await api.get<RepairTicket[]>('/vrms/repairs/history', {
    params: {
      search,
    },
  });
  return response.data;
}

export async function getRepair(repairId: string): Promise<RepairTicket> {
  const response = await api.get<RepairTicket>(`/vrms/repairs/${repairId}`);
  return response.data;
}

export async function updateRepairStatus(repairId: string, status: RepairStatus): Promise<RepairTicket> {
  const response = await api.patch<RepairTicket>(`/vrms/repairs/${repairId}/status`, { status });
  return response.data;
}

export async function createRepair(payload: CreateRepairPayload): Promise<RepairTicket> {
  const response = await api.post<RepairTicket>('/vrms/repairs', payload);
  return response.data;
}
