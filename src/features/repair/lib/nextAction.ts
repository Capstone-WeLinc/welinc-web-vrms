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

/** Mechanics only ever load tickets they are assigned to (the API answers 403 otherwise). */
export function nextAction(ticket: RepairTicket, isAdmin: boolean): NextAction {
  if (isClosed(ticket)) {
    if (!isAdmin) return { kind: 'note', text: 'This ticket is closed.' };
    return ticket.isUnlocked
      ? { kind: 'note', text: 'Unlocked for editing. Saving costs locks it again.' }
      : { kind: 'unlock', label: 'Unlock ticket' };
  }
  if (ticket.status === 'FOR_VERIFICATION' && !isAdmin) {
    return { kind: 'note', text: 'Waiting for an admin to sign off.' };
  }
  const step = FORWARD[ticket.status];
  return step ? { kind: 'move', ...step } : { kind: 'note', text: 'No next step for this status.' };
}

export function hasActionButton(action: NextAction) {
  return action.kind !== 'note';
}

/** Admins cancel open tickets only; cancelling finished work is a status override (feature 33). */
export function canCancel(ticket: RepairTicket, isAdmin: boolean) {
  return isAdmin && !isClosed(ticket);
}

/** Matches the server: costs open at For verification, and on a closed ticket only while unlocked. */
export function canEditCosts(ticket: RepairTicket, isAdmin: boolean) {
  return isAdmin && (ticket.status === 'FOR_VERIFICATION' || (isClosed(ticket) && !!ticket.isUnlocked));
}

/** Any cost recorded, a 0 included (the API sends a stored 0 as 0). */
export function hasCosts(ticket: RepairTicket) {
  return ticket.partsCost != null || ticket.laborCost != null || ticket.totalCost != null || (ticket.repairParts?.length ?? 0) > 0;
}

/** Anchor of the Costs section, for the "Go to costs" link. */
export const COSTS_SECTION_ID = 'costs';

/** AC-19: a write was refused because the ticket changed since it loaded. */
export const STALE_TICKET_MESSAGE = 'This ticket changed since you opened it. We loaded the latest version.';
