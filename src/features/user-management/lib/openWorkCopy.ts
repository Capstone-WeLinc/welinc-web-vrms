import { statusLabel } from '../../../components/shared/statusLabels';

// Spec 0011, AC-35: the words of a person's open work. Pure, so they test without a screen.

/** "2 assigned, 1 in progress": the open statuses that have tickets, in the order given. */
export function openWorkSummary(byStatus: Record<string, number>) {
  return Object.entries(byStatus)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => `${count} ${statusLabel(status).toLowerCase()}`)
    .join(', ');
}
