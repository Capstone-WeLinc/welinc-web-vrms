import api from './axios';
import type { ExpediteRequest, PriorityLevel, RepairTicket } from '../../types';

// Spec 0029 (child 0003): BMS's side of a repair. The trips are read live from BMS by the backend;
// expedite requests are answered behind `integration.respond`.

/** One upcoming trip of a truck, as BMS has it: schedule facts only. */
export interface UpcomingTrip {
  bookingNumber: string;
  jobOrderNumber: string | null;
  /** YYYY-MM-DD, Asia/Manila. */
  serviceDate: string;
  /** HH:MM, or null when BMS has no dispatch time yet. */
  dispatchTime: string | null;
  status: string;
}

/** `available: false` means BMS can't be reached; nothing else is wrong. */
export type UpcomingTrips = { available: true; items: UpcomingTrip[] } | { available: false };

/** AC-16: the truck's trips for the next 14 days. `quiet` because a failure has its own text. */
export async function getVehicleSchedule(vehicleId: string, options: { quiet?: boolean } = {}) {
  const response = await api.get<UpcomingTrips>('/vrms/repairs/vehicle-schedule', {
    params: { vehicleId },
    quiet: options.quiet ?? true,
  });
  return response.data;
}

export interface ExpediteRequestList {
  items: ExpediteRequest[];
  waitingCount: number;
}

/** AC-18: every waiting request, oldest first, for the Admin dashboard. */
export async function getExpediteRequests(options: { quiet?: boolean } = {}) {
  const response = await api.get<ExpediteRequestList>('/vrms/expedite-requests', { quiet: options.quiet });
  return response.data;
}

/** AC-19: raise the priority, and set a new due date when one is given. `updatedAt` is the ticket as loaded. */
export async function acceptExpedite(
  id: string,
  body: { priority: PriorityLevel; dueAt?: string; updatedAt: string },
) {
  const response = await api.post<RepairTicket>(`/vrms/expedite-requests/${encodeURIComponent(id)}/accept`, body);
  return response.data;
}

/** AC-19: declined with a reason of 5 to 500 characters. */
export async function declineExpedite(id: string, reason: string) {
  const response = await api.post<RepairTicket>(`/vrms/expedite-requests/${encodeURIComponent(id)}/decline`, {
    reason,
  });
  return response.data;
}
