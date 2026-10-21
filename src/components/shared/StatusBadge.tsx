import { BadgePill } from './BadgePill';

interface StatusBadgeProps {
  /** A RepairStatus, or a user account status (ACTIVE, INACTIVE, LOCKED, PENDING_VERIFICATION). */
  status: string;
}

const PENDING = 'bg-status-pending-bg text-status-pending-fg';
const CANCELLED = 'bg-status-cancelled-bg text-status-cancelled-fg';
const COMPLETED = 'bg-status-completed-bg text-status-completed-fg';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: PENDING },
  PENDING_VERIFICATION: { label: 'Pending verification', className: PENDING },
  IN_PROGRESS: { label: 'In progress', className: 'bg-status-in-progress-bg text-status-in-progress-fg' },
  FOR_VERIFICATION: { label: 'For verification', className: 'bg-status-for-verification-bg text-status-for-verification-fg' },
  COMPLETED: { label: 'Completed', className: COMPLETED },
  CANCELLED: { label: 'Cancelled', className: CANCELLED },
  ACTIVE: { label: 'Active', className: COMPLETED },
  INACTIVE: { label: 'Inactive', className: CANCELLED },
  LOCKED: { label: 'Locked', className: CANCELLED },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const meta = STATUS_MAP[status] ?? { label: status, className: CANCELLED };
  return <BadgePill className={meta.className}>{meta.label}</BadgePill>;
}
