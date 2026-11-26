import api from './axios';
import type { RepairTicket } from '../../types';

// Spec 0029 (child 0002): VMMS repair referrals, behind `integration.respond`.

export type ReferralStatus = 'WAITING' | 'OPENED_TICKET' | 'ADDED_TO_TICKET' | 'REJECTED';

export interface ReferralFinding {
  checklistItemId: string;
  label: string;
  note: string | null;
}

export interface ReferralRow {
  id: string;
  receivedAt: string;
  vehiclePlate: string;
  workOrderNumber: string;
  findingsCount: number;
  status: ReferralStatus;
  repairTicket: { id: string; repairNumber: string } | null;
}

export interface ReferralList {
  items: ReferralRow[];
  nextCursor: string | null;
  /** For the tab label and the dashboard card, whatever the filter. */
  waitingCount: number;
}

export interface ReferralDetail {
  id: string;
  status: ReferralStatus;
  receivedAt: string;
  workOrderNumber: string;
  odometerReading: number;
  findings: ReferralFinding[];
  chiefMechanicRemarks: string | null;
  rejectionReason: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  repairTicket: { id: string; repairNumber: string } | null;
  vehicle: {
    id: string;
    plateNumber: string;
    model: string;
    isActive: boolean;
    garage: { id: string; name: string } | null;
    openTicket: { id: string; repairNumber: string; repairStatus: string; updatedAt: string } | null;
  };
}

/** `quiet` skips the global error toasts, for a background refetch. */
export async function getReferrals(
  params: { status?: ReferralStatus; cursor?: string; limit?: number } = {},
  options: { quiet?: boolean } = {},
) {
  const response = await api.get<ReferralList>('/vrms/referrals', { params, quiet: options.quiet });
  return response.data;
}

export async function getReferral(id: string) {
  const response = await api.get<ReferralDetail>(`/vrms/referrals/${encodeURIComponent(id)}`);
  return response.data;
}

/** One finding as an issue line on the open ticket (AC-9). */
export interface ReferralIssueLine {
  description: string;
  categoryId: string;
}

/** AC-9: the findings join the truck's open ticket; `updatedAt` is that ticket as loaded. */
export async function addReferralToTicket(id: string, body: { issues: ReferralIssueLine[]; updatedAt: string }) {
  const response = await api.post<RepairTicket>(`/vrms/referrals/${encodeURIComponent(id)}/add-to-ticket`, body);
  return response.data;
}

/** AC-10: sent back to VMMS with a reason of 5 to 500 characters. */
export async function rejectReferral(id: string, reason: string) {
  const response = await api.post<ReferralDetail>(`/vrms/referrals/${encodeURIComponent(id)}/reject`, { reason });
  return response.data;
}
