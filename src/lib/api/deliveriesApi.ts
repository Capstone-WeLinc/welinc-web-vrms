import api from './axios';

// Spec 0029 (child 0004), AC-22: every message VRMS sent, or is still sending, to VMMS and BMS.
// Reading needs `audit.view`; Retry and Dismiss need `integration.respond`.

export type DeliveryStatus = 'PENDING' | 'SENT' | 'FAILED' | 'DISMISSED';
export type DeliveryTarget = 'VMMS' | 'BMS';
export type DeliveryKind = 'REPAIR_EVENT' | 'REFERRAL_REJECTED' | 'REPAIR_UPDATE' | 'EXPEDITE_ANSWER';

export interface DeliveryRow {
  id: string;
  createdAt: string;
  target: DeliveryTarget;
  kind: DeliveryKind;
  status: DeliveryStatus;
  attempts: number;
  lastStatusCode: number | null;
  lastError: string | null;
  ticket: { id: string; repairNumber: string } | null;
  referral: { id: string; workOrderNumber: string } | null;
  /** Still retrying after 3 attempts: a missing grant shows within minutes. */
  warning: boolean;
}

export interface DeliveryList {
  items: DeliveryRow[];
  nextCursor: string | null;
  /** For the tab label, whatever the filter. */
  failedCount: number;
}

export interface DeliveryDetail extends DeliveryRow {
  payload: unknown;
  firstAttemptAt: string | null;
  lastAttemptAt: string | null;
  nextAttemptAt: string;
  sentAt: string | null;
  manualRetryCount: number;
  dismissReason: string | null;
}

export type DeliveryFilters = { status?: DeliveryStatus; target?: DeliveryTarget; kind?: DeliveryKind };

/** `quiet` skips the global error toasts, for a background refetch. */
export async function getDeliveries(params: DeliveryFilters & { cursor?: string; limit?: number } = {}, options: { quiet?: boolean } = {}) {
  const response = await api.get<DeliveryList>('/vrms/deliveries', { params, quiet: options.quiet });
  return response.data;
}

export async function getDelivery(id: string) {
  const response = await api.get<DeliveryDetail>(`/vrms/deliveries/${encodeURIComponent(id)}`);
  return response.data;
}

export async function retryDelivery(id: string) {
  const response = await api.post<DeliveryDetail>(`/vrms/deliveries/${encodeURIComponent(id)}/retry`);
  return response.data;
}

export async function dismissDelivery(id: string, reason: string) {
  const response = await api.post<DeliveryDetail>(`/vrms/deliveries/${encodeURIComponent(id)}/dismiss`, { reason });
  return response.data;
}
