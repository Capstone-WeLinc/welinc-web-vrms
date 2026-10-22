// Sentence case labels for StatusBadge, also read by toasts and dialogs so they are never retyped.
// BadgePill uppercases them on screen.

export const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PENDING_VERIFICATION: 'Pending verification',
  IN_PROGRESS: 'In progress',
  FOR_VERIFICATION: 'For verification',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  LOCKED: 'Locked',
};

export function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}
