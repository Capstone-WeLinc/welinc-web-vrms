import type { DeliveryFilters, DeliveryKind, DeliveryRow, DeliveryStatus, DeliveryTarget } from '../../../lib/api/deliveriesApi';

// Spec 0029 (child 0004), AC-22: the Deliveries tab's words and URL filters. Pure, so they test
// without a browser.

export type AuditView = 'activity' | 'deliveries';

export function auditView(raw: string | null): AuditView {
  return raw === 'deliveries' ? 'deliveries' : 'activity';
}

export const DELIVERY_STATUSES: DeliveryStatus[] = ['FAILED', 'PENDING', 'SENT', 'DISMISSED'];
export const DELIVERY_TARGETS: DeliveryTarget[] = ['VMMS', 'BMS'];
export const DELIVERY_KINDS: DeliveryKind[] = ['REPAIR_EVENT', 'REFERRAL_REJECTED', 'REPAIR_UPDATE', 'EXPEDITE_ANSWER'];

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  PENDING: 'Sending',
  SENT: 'Sent',
  FAILED: 'Failed',
  DISMISSED: 'Dismissed',
};

export const DELIVERY_KIND_LABEL: Record<DeliveryKind, string> = {
  REPAIR_EVENT: 'Repair event',
  REFERRAL_REJECTED: 'Referral rejected',
  REPAIR_UPDATE: 'Repair update',
  EXPEDITE_ANSWER: 'Expedite answer',
};

/** Reads the filters from the URL; anything unknown is left out. */
export function deliveryFiltersFrom(params: URLSearchParams): DeliveryFilters {
  const pick = <T extends string>(raw: string | null, allowed: readonly T[]) =>
    allowed.includes(raw as T) ? (raw as T) : undefined;
  return {
    status: pick(params.get('status'), DELIVERY_STATUSES),
    target: pick(params.get('target'), DELIVERY_TARGETS),
    kind: pick(params.get('kind'), DELIVERY_KINDS),
  };
}

/** The URL for the Deliveries tab with these filters. */
export function deliveryParams(filters: DeliveryFilters): Record<string, string> {
  return {
    view: 'deliveries',
    ...(filters.status && { status: filters.status }),
    ...(filters.target && { target: filters.target }),
    ...(filters.kind && { kind: filters.kind }),
  };
}

/** What the message is about: its ticket, the referral it answers, or nothing. */
export function deliverySubject(row: Pick<DeliveryRow, 'ticket' | 'referral'>): string | null {
  return row.ticket?.repairNumber ?? row.referral?.workOrderNumber ?? null;
}

/** The last error as people read it: "409 INVALID_REPAIR_EVENT", "TimeoutError", or null. */
export function lastErrorText(row: Pick<DeliveryRow, 'lastStatusCode' | 'lastError'>): string | null {
  if (row.lastStatusCode && row.lastError) return `${row.lastStatusCode} ${row.lastError}`;
  if (row.lastStatusCode) return String(row.lastStatusCode);
  return row.lastError;
}
