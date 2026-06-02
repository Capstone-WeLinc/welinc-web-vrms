export function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildStatusClass(status: string) {
  switch (status) {
    case 'IN_PROGRESS':
      return 'status-chip status-in-progress';
    case 'FOR_VERIFICATION':
      return 'status-chip status-for-verification';
    case 'COMPLETED':
      return 'status-chip status-completed';
    case 'CANCELLED':
      return 'status-chip status-cancelled';
    default:
      return 'status-chip status-pending';
  }
}
