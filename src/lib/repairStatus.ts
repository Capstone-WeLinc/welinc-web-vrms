import type { RepairStatus } from '../types';

// Spec 0010, AC-4a: the one definition of open and finished tickets, mirroring the backend's
// ticket-statuses.ts. Every screen reads these, never a list of its own.

export const REPAIR_STATUSES: RepairStatus[] = [
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'ON_HOLD',
  'FOR_VERIFICATION',
  'OUTSOURCED',
  'PENDING_APPROVAL',
  'CLOSED',
  'CANCELLED',
];

/** CLOSED and CANCELLED: the ticket is over, and locked until an Admin unlocks it. */
export const FINISHED_STATUSES: RepairStatus[] = ['CLOSED', 'CANCELLED'];

/** Every status except the finished ones. */
export const OPEN_STATUSES: RepairStatus[] = REPAIR_STATUSES.filter((s) => !FINISHED_STATUSES.includes(s));

export function isFinishedStatus(status: RepairStatus) {
  return FINISHED_STATUSES.includes(status);
}
