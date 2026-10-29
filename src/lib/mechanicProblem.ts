import type { RepairTicket } from '../types';

/** The ticket's staffing problem, if any (spec 0011, AC-34). An inactive assignee wins over no mechanic. */
export function mechanicProblem(ticket: Pick<RepairTicket, 'hasInactiveMechanic' | 'needsMechanic'>) {
  if (ticket.hasInactiveMechanic) return 'Inactive mechanic';
  if (ticket.needsMechanic) return 'Needs a mechanic';
  return null;
}
