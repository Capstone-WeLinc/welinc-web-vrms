import api from './axios';
import { CreateRepairPayload, RepairPart, RepairStatus, RepairTicket } from '../../types';

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

export async function updateRepairStatus(
  repairId: string,
  status: RepairStatus,
  extras?: { cancellationReason?: string; failedVerificationReason?: string; remarks?: string },
): Promise<RepairTicket> {
  const response = await api.patch<RepairTicket>(`/vrms/repairs/${repairId}/status`, {
    status,
    ...extras,
  });
  return response.data;
}

export async function createRepair(payload: CreateRepairPayload): Promise<RepairTicket> {
  const response = await api.post<RepairTicket>('/vrms/repairs', payload);
  return response.data;
}

export interface UpdateCostsPayload {
  isLumpSum: boolean;
  partsCost?: number;
  laborCost?: number;
  parts?: { description: string; unitCost: number; quantity: number }[];
}

export async function updateRepairCosts(
  repairId: string,
  payload: UpdateCostsPayload,
): Promise<RepairTicket> {
  const response = await api.patch<RepairTicket>(`/vrms/repairs/${repairId}/costs`, payload);
  return response.data;
}

export async function unlockRepairTicket(
  repairId: string,
  unlockReason: string,
): Promise<RepairTicket> {
  const response = await api.patch<RepairTicket>(`/vrms/repairs/${repairId}/unlock`, {
    unlockReason,
  });
  return response.data;
}

export interface AuditEntry {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  ticketId?: string | null;
}

export async function getAuditLogs(): Promise<AuditEntry[]> {
  const response = await api.get<AuditEntry[]>('/vrms/repairs/audit-logs/all');
  return response.data;
}
