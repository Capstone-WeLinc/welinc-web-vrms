import type { RepairStatus, RepairTicket } from '../types';

/**
 * Spec 0019, AC-13: the statuses where a ticket can sit with no mechanic after a mechanics edit.
 * Open has none by design, and Assigned always has one (M1 and M2).
 */
export const NO_MECHANIC_STATUSES: RepairStatus[] = ['IN_PROGRESS', 'ON_HOLD', 'FOR_VERIFICATION', 'OUTSOURCED', 'PENDING_APPROVAL'];

type Staffing = Pick<RepairTicket, 'hasInactiveMechanic' | 'needsMechanic' | 'status' | 'mechanicCount'>;

/** Spec 0019, AC-13: past Assigned with nobody on it. Read from list rows' mechanicCount. */
export function hasNoMechanic(ticket: Pick<RepairTicket, 'status' | 'mechanicCount'>) {
  return ticket.mechanicCount === 0 && NO_MECHANIC_STATUSES.includes(ticket.status);
}

/**
 * The ticket's staffing problem, if any (spec 0011, AC-34). An inactive assignee wins, then "No
 * mechanic" (spec 0019, AC-13), then a worked ticket whose mechanics are all inactive.
 */
export function mechanicProblem(ticket: Staffing) {
  if (ticket.hasInactiveMechanic) return 'Inactive mechanic';
  if (hasNoMechanic(ticket)) return 'No mechanic';
  if (ticket.needsMechanic) return 'Needs a mechanic';
  return null;
}
