import { BadgePill } from './BadgePill';
import { statusLabel } from './statusLabels';

interface StatusBadgeProps {
  /** A RepairStatus, a VehicleStatus, a user account status (ACTIVE, INACTIVE, DELETED), or a knowledge entry status (DRAFT). */
  status: string;
}

const PENDING = 'bg-status-pending-bg text-status-pending-fg';
const CANCELLED = 'bg-status-cancelled-bg text-status-cancelled-fg';
const COMPLETED = 'bg-status-completed-bg text-status-completed-fg';
const IN_PROGRESS = 'bg-status-in-progress-bg text-status-in-progress-fg';
const FOR_VERIFICATION = 'bg-status-for-verification-bg text-status-for-verification-fg';

const STATUS_CLASSES: Record<string, string> = {
  // Waiting on someone: not started, held, or waiting on an approval
  OPEN: PENDING,
  ASSIGNED: PENDING,
  ON_HOLD: PENDING,
  PENDING_APPROVAL: PENDING,
  DRAFT: PENDING,
  IN_PROGRESS,
  OUTSOURCED: IN_PROGRESS,
  FOR_VERIFICATION,
  CLOSED: COMPLETED,
  CANCELLED,
  AVAILABLE: COMPLETED,
  UNDER_REPAIR: IN_PROGRESS,
  UNDER_MAINTENANCE: IN_PROGRESS,
  DISABLED: CANCELLED,
  ACTIVE: COMPLETED,
  INACTIVE: CANCELLED,
  DELETED: CANCELLED,
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return <BadgePill className={STATUS_CLASSES[status] ?? CANCELLED}>{statusLabel(status)}</BadgePill>;
}
