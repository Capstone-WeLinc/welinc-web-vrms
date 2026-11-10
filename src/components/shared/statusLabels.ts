// Sentence case labels for StatusBadge, also read by toasts and dialogs so they are never retyped.
// BadgePill uppercases them on screen.

export const STATUS_LABELS: Record<string, string> = {
  // Ticket statuses (spec 0010)
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  ON_HOLD: 'On hold',
  FOR_VERIFICATION: 'For verification',
  OUTSOURCED: 'Outsourced',
  PENDING_APPROVAL: 'Pending approval',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
  // Vehicle statuses
  AVAILABLE: 'Available',
  UNDER_REPAIR: 'Under repair',
  UNDER_MAINTENANCE: 'Under maintenance',
  DISABLED: 'Disabled',
  // Account and knowledge entry statuses
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  LOCKED: 'Locked',
  SETUP_PENDING: 'Setup pending',
  EMAIL_NOT_VERIFIED: 'Email not verified',
  DRAFT: 'Draft',
};

export function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}
