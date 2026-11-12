import { statusLabel } from '../../../components/shared/statusLabels';
import type { SystemType } from '../../../types';

// Spec 0011, AC-35: the words of the open work confirm. Pure, so they test without a screen.

/** "VMMS", "VMMS and BMS", "VMMS, BMS and SHARED". */
export function systemsText(systems: readonly string[]) {
  if (systems.length <= 1) return systems.join('');
  return `${systems.slice(0, -1).join(', ')} and ${systems[systems.length - 1]}`;
}

/** "2 assigned, 1 in progress": the open statuses that have tickets, in the order given. */
export function openWorkSummary(byStatus: Record<string, number>) {
  return Object.entries(byStatus)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => `${count} ${statusLabel(status).toLowerCase()}`)
    .join(', ');
}

/** The closing sentence for a deactivate on a shared account, or an empty string. */
export function sharedBlockNote(otherSystems: readonly SystemType[] | undefined) {
  return otherSystems?.length ? ` This also blocks their ${systemsText(otherSystems)} sign in.` : '';
}

export function ticketCount(total: number) {
  return total === 1 ? '1 open ticket' : `${total} open tickets`;
}
