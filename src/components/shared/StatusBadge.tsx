import React from 'react';

interface StatusBadgeProps {
  status: string;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Pending', cls: 'status-pending' },
  PENDING_VERIFICATION: { label: 'Pending Verification', cls: 'status-pending' },
  IN_PROGRESS: { label: 'In Progress', cls: 'status-in-progress' },
  FOR_VERIFICATION: { label: 'For Verification', cls: 'status-for-verification' },
  COMPLETED: { label: 'Completed', cls: 'status-completed' },
  CANCELLED: { label: 'Cancelled', cls: 'status-cancelled' },
  ACTIVE: { label: 'Active', cls: 'status-completed' },
  INACTIVE: { label: 'Inactive', cls: 'status-cancelled' },
  LOCKED: { label: 'Locked', cls: 'status-cancelled' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const meta = STATUS_MAP[status] || { label: status, cls: 'status-pending' };
  return <span className={`status-chip ${meta.cls}`}>{meta.label}</span>;
}
