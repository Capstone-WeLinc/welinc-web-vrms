import { BadgePill } from './BadgePill';
import { statusLabel } from './statusLabels';

interface StatusBadgeProps {
  /** A RepairStatus, a user account status (ACTIVE, INACTIVE, LOCKED, SETUP_PENDING), or a knowledge entry status (DRAFT). */
  status: string;
}

const PENDING = 'bg-status-pending-bg text-status-pending-fg';
const CANCELLED = 'bg-status-cancelled-bg text-status-cancelled-fg';
const COMPLETED = 'bg-status-completed-bg text-status-completed-fg';

const STATUS_CLASSES: Record<string, string> = {
  PENDING,
  SETUP_PENDING: PENDING,
  DRAFT: PENDING,
  IN_PROGRESS: 'bg-status-in-progress-bg text-status-in-progress-fg',
  FOR_VERIFICATION: 'bg-status-for-verification-bg text-status-for-verification-fg',
  COMPLETED,
  CANCELLED,
  ACTIVE: COMPLETED,
  INACTIVE: CANCELLED,
  LOCKED: CANCELLED,
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return <BadgePill className={STATUS_CLASSES[status] ?? CANCELLED}>{statusLabel(status)}</BadgePill>;
}
