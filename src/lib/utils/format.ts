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

/** Two letters for an avatar: first and last word of the name, else its first two letters. */
export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.trim().slice(0, 2);
  return letters.toUpperCase();
}
