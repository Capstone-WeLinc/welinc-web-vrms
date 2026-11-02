import api from './axios';
import type {
  AccountType,
  CreateRepairPayload,
  IssueResolution,
  PriorityLevel,
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

export async function getRepairs(
  params: RepairListParams = {},
  options: { quiet?: boolean } = {},
): Promise<{ data: RepairTicket[], total: number }> {
  const response = await api.get<{ data: RepairTicket[], total: number } | RepairTicket[]>('/vrms/repairs', {
    params: { ...params, search: params.search || undefined, overdue: params.overdue || undefined },
    quiet: options.quiet,
  });
  if (Array.isArray(response.data)) {
    return { data: response.data, total: response.data.length };
  }
  return response.data;
}

export interface RepairHistoryParams {
  search?: string;
  status?: 'CLOSED' | 'CANCELLED';
  garageId?: string;
  /** Feature 23: only tickets this user verified. */
  verifiedBy?: string;
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
  /** Everyone who verified a closed ticket the caller can read, sorted by name. Ignores the other filters. */
  verifiers: VerifierOption[];
}

export interface VerifierOption {
  id: string;
  name: string;
}

export async function getRepairHistory(
  params: RepairHistoryParams = {},
  options: { quiet?: boolean } = {},
): Promise<RepairHistoryResponse> {
  const response = await api.get<RepairHistoryResponse>('/vrms/repairs/history', {
    params: { ...params, search: params.search || undefined },
    quiet: options.quiet,
  });
  return response.data;
}

/** `quiet` skips the global error toasts, for the background refetch that handles its own (spec 0019, AC-23). */
export async function getRepair(repairId: string, options: { quiet?: boolean } = {}): Promise<RepairTicket> {
  const response = await api.get<RepairTicket>(`/vrms/repairs/${repairId}`, { quiet: options.quiet });
  return response.data;
}

export async function updateRepairStatus(
  repairId: string,
  status: RepairStatus,
  extras: {
    cancellationReason?: string;
    remarks?: string;
    /** Required: the server refuses a move without it (spec 0014, AC-12). */
    lastUpdatedAt: string;
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
  lastUpdatedAt: string;
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
  lastUpdatedAt: string,
): Promise<RepairTicket> {
  const response = await api.patch<RepairTicket>(`/vrms/repairs/${repairId}/unlock`, {
    unlockReason,
    lastUpdatedAt,
  });
  return response.data;
}

/** Spec 0019: what every edit sends. `reason` is required on an unlocked Closed or Cancelled ticket (AC-3). */
export interface TicketEditBase {
  lastUpdatedAt: string;
  reason?: string;
}

/** PATCH /details: only the fields that changed (spec 0019, AC-4 to AC-8). */
export interface EditDetailsPayload extends TicketEditBase {
  /** At most one of an existing driver and a new one by LTO license (AC-4). */
  driverId?: string;
  newDriver?: { name: string; licenseNumber: string };
  odometerReading?: number;
  /** The reading is right even though it jumps far above the last one (AC-5). */
  confirmOdometerJump?: boolean;
  priority?: PriorityLevel;
  /** Corporate needs corporationId; Online clears the corporation (AC-7). */
  accountType?: AccountType;
  corporationId?: string;
}

export async function editTicketDetails(repairId: string, payload: EditDetailsPayload): Promise<RepairTicket> {
  const response = await api.patch<RepairTicket>(`/vrms/repairs/${repairId}/details`, payload);
  return response.data;
}

/**
 * Sets the full mechanic list on any open ticket (ticket.assign, spec 0019, AC-9). The first
 * mechanic on an Open ticket makes it Assigned; removing the last from an Assigned one makes it
 * Open again (AC-10). Also behind the Assign action of an Open ticket (spec 0016, AC-17).
 */
export async function setMechanics(repairId: string, mechanicIds: string[], base: TicketEditBase): Promise<RepairTicket> {
  const response = await api.put<RepairTicket>(`/vrms/repairs/${repairId}/assignments`, {
    ...base,
    mechanics: mechanicIds.map((id) => ({ id })),
  });
  return response.data;
}

/** POST /issues: create's issue fields and rules (spec 0019, AC-14). */
export interface AddIssuePayload extends TicketEditBase {
  categoryId: string;
  rootCause: string;
  /** Left out when blank and a known fix is picked: the server uses its name. */
  description?: string;
  knowledgeEntryId?: string;
}

export async function addTicketIssue(repairId: string, payload: AddIssuePayload): Promise<RepairTicket> {
  const response = await api.post<RepairTicket>(`/vrms/repairs/${repairId}/issues`, payload);
  return response.data;
}

/** PATCH /issues/:issueId: the system and the text after "[System] " (spec 0019, AC-15). */
export async function editTicketIssue(
  repairId: string,
  issueId: string,
  payload: TicketEditBase & { categoryId: string; text: string },
): Promise<RepairTicket> {
  const response = await api.patch<RepairTicket>(`/vrms/repairs/${repairId}/issues/${issueId}`, payload);
  return response.data;
}

/** A POST, since proxies may drop a DELETE body; the last issue answers 400 LAST_ISSUE (spec 0019, AC-16, AC-17). */
export async function removeTicketIssue(repairId: string, issueId: string, base: TicketEditBase): Promise<RepairTicket> {
  const response = await api.post<RepairTicket>(`/vrms/repairs/${repairId}/issues/${issueId}/remove`, base);
  return response.data;
}
