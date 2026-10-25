import api from './axios';
import type {
  CreateRepairPayload,
  IssueResolution,
  RepairHistoryRow,
  RepairHistorySummary,
  RepairIssueStep,
  RepairStatus,
  RepairTicket,
} from '../../types';

export interface RepairListParams {
  search?: string;
  /** Without it the server returns open tickets only. */
  status?: RepairStatus;
  garageId?: string;
  /** Admins only; the server ignores it for mechanics. */
  mechanicId?: string;
  /** Open tickets past their due date, by the server's clock. */
  overdue?: boolean;
  /** Neither page nor limit returns every matching row. */
  page?: number;
  limit?: number;
}

export async function getRepairs(params: RepairListParams = {}): Promise<{ data: RepairTicket[], total: number }> {
  const response = await api.get<{ data: RepairTicket[], total: number } | RepairTicket[]>('/vrms/repairs', {
    params: { ...params, search: params.search || undefined, overdue: params.overdue || undefined },
  });
  if (Array.isArray(response.data)) {
    return { data: response.data, total: response.data.length };
  }
  return response.data;
}

export interface RepairHistoryParams {
  search?: string;
  status?: 'COMPLETED' | 'CANCELLED';
  garageId?: string;
  /** ISO instant, inclusive, on the close date. */
  from?: string;
  /** ISO instant, exclusive. */
  to?: string;
  page?: number;
  limit?: number;
}

export interface RepairHistoryResponse {
  data: RepairHistoryRow[];
  total: number;
  summary: RepairHistorySummary;
}

export async function getRepairHistory(params: RepairHistoryParams = {}): Promise<RepairHistoryResponse> {
  const response = await api.get<RepairHistoryResponse>('/vrms/repairs/history', {
    params: { ...params, search: params.search || undefined },
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
  extras?: {
    cancellationReason?: string;
    failedVerificationReason?: string;
    remarks?: string;
    lastUpdatedAt?: string;
    /** Spec 0007, AC-31: required on In progress to For verification. */
    resolutions?: IssueResolution[];
  },
): Promise<RepairTicket> {
  const response = await api.patch<RepairTicket>(`/vrms/repairs/${repairId}/status`, {
    status,
    ...extras,
  });
  return response.data;
}

/** Link, relink (an entry id) or remove (null) one issue's known fix (spec 0007, AC-29). */
export async function linkIssueKnowledge(
  repairId: string,
  issueId: string,
  knowledgeEntryId: string | null,
  lastUpdatedAt: string,
): Promise<RepairTicket> {
  const response = await api.patch<RepairTicket>(`/vrms/repairs/${repairId}/issues/${issueId}/knowledge`, {
    knowledgeEntryId,
    lastUpdatedAt,
  });
  return response.data;
}

/** Tick or untick one known fix step; the ticket's updatedAt stays (spec 0007, AC-28). */
export async function checkIssueStep(repairId: string, issueId: string, stepId: string, checked: boolean): Promise<RepairIssueStep> {
  const response = await api.patch<RepairIssueStep>(`/vrms/repairs/${repairId}/issues/${issueId}/steps/${stepId}`, { checked });
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
  lastUpdatedAt?: string;
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
