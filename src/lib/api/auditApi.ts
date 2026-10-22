import api from './axios';
import type { AuditActor, AuditEvent } from '../../types';

export interface AuditEventParams {
  /** One stored action, such as `STATUS_CHANGE`. */
  type?: string;
  /** A VRMS user id from `getAuditActors()`. */
  actorId?: string;
  /** ISO instant, inclusive. */
  from?: string;
  /** ISO instant, exclusive. */
  to?: string;
  /** Partial repair number; the server ignores it under 2 characters. */
  repairNumber?: string;
  /** One ticket's events, for the repair detail Activity section. */
  ticketId?: string;
  /** `nextCursor` from the previous page. Send the same filters with it. */
  cursor?: string;
  limit?: number;
}

export async function getAuditEvents(params: AuditEventParams = {}): Promise<{ data: AuditEvent[]; nextCursor: string | null }> {
  const response = await api.get<{ data: AuditEvent[]; nextCursor: string | null }>('/vrms/repairs/audit-logs', { params });
  return response.data;
}

export async function getAuditActors(): Promise<AuditActor[]> {
  const response = await api.get<AuditActor[]>('/vrms/repairs/audit-logs/actors');
  return response.data;
}
