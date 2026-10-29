import type { RepairStatus, RepairTicket } from '../../../types';
import { isFinishedStatus } from '../../../lib/repairStatus';

// Spec 0004, AC-14: the one next step a ticket offers. It mirrors the server's forward only
// rule (ASSIGNED → IN_PROGRESS → FOR_VERIFICATION → CLOSED, spec 0010), so the page never offers a
// move the server rejects.

export type NextAction =
  | { kind: 'move'; label: string; to: RepairStatus }
  | { kind: 'unlock'; label: string }
  | { kind: 'note'; text: string };

const FORWARD: Partial<Record<RepairStatus, { to: RepairStatus; label: string }>> = {
  ASSIGNED: { to: 'IN_PROGRESS', label: 'Start work' },
  IN_PROGRESS: { to: 'FOR_VERIFICATION', label: 'Send for verification' },
  FOR_VERIFICATION: { to: 'CLOSED', label: 'Verify and close' },
};

export function isClosed(ticket: Pick<RepairTicket, 'status'>) {
  return isFinishedStatus(ticket.status);
}

/**
 * From the ticket's own `can` flags, which the server computes for the caller (spec 0011, AC-12a).
 * `administer` offers every forward move; `work` stops before close; neither is view only.
 */
export function nextAction(ticket: RepairTicket): NextAction {
  const { can } = ticket;
  if (isClosed(ticket)) {
    if (!can.unlock) return { kind: 'note', text: 'This ticket is closed.' };
    return ticket.isUnlocked
      ? { kind: 'note', text: 'Unlocked for editing. Saving costs locks it again.' }
      : { kind: 'unlock', label: 'Unlock ticket' };
  }
  if (!can.administer && !can.work) {
    return { kind: 'note', text: 'This ticket is assigned to someone else.' };
  }
  if (ticket.status === 'FOR_VERIFICATION' && !can.administer) {
    return { kind: 'note', text: 'Waiting for an admin to sign off.' };
  }
  const step = FORWARD[ticket.status];
  return step ? { kind: 'move', ...step } : { kind: 'note', text: 'No next step for this status.' };
}

export function hasActionButton(action: NextAction) {
  return action.kind !== 'note';
}

/** Cancelling is an administer move, on open tickets only; finished work is feature 33's override. */
export function canCancel(ticket: RepairTicket) {
  return ticket.can.administer && !isClosed(ticket);
}

/** Matches the server: costs open at For verification, and on a closed ticket only while unlocked. */
export function canEditCosts(ticket: RepairTicket) {
  return ticket.can.editCosts && (ticket.status === 'FOR_VERIFICATION' || (isClosed(ticket) && !!ticket.isUnlocked));
}

/** Status moves, steps and known fixes: the caller's own ticket, or any with administer (AC-12). */
export function canWorkTicket(ticket: RepairTicket) {
  return ticket.can.work || ticket.can.administer;
}

/** Any cost recorded, a 0 included (the API sends a stored 0 as 0). */
export function hasCosts(ticket: RepairTicket) {
  return ticket.partsCost != null || ticket.laborCost != null || ticket.totalCost != null || (ticket.repairParts?.length ?? 0) > 0;
}

/** Anchor of the Costs section, for the "Go to costs" link. */
export const COSTS_SECTION_ID = 'costs';

/** AC-19: a write was refused because the ticket changed since it loaded. */
export const STALE_TICKET_MESSAGE = 'This ticket changed since you opened it. We loaded the latest version.';
