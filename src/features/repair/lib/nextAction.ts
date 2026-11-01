import type { RepairTicket, TicketMove } from '../../../types';
import { isFinishedStatus } from '../../../lib/repairStatus';

// Spec 0014, AC-15: the detail page's actions come from `ticket.moves` only, the moves the server
// lets this caller make right now. The page holds no copy of the transition table, so it never
// offers a move the server rejects.

/** The main button: the forward move, or Unlock on a finished ticket. */
export type PrimaryAction =
  | { kind: 'move'; move: TicketMove }
  | { kind: 'unlock'; label: string }
  | { kind: 'assign'; label: string };

export interface TicketActions {
  primary: PrimaryAction | null;
  /** Send back, beside or under the primary button. */
  secondary: TicketMove | null;
  cancel: TicketMove | null;
  /** What the status card says when there is no primary button. */
  note: string | null;
  /** Why the primary button is disabled, or null when it works (spec 0015, AC-5). */
  blocked: string | null;
}

export function isClosed(ticket: Pick<RepairTicket, 'status'>) {
  return isFinishedStatus(ticket.status);
}

function finishedActions(ticket: RepairTicket): TicketActions {
  const none = { secondary: null, cancel: null, blocked: null };
  // Unlock stays on its own flag (AC-13)
  if (!ticket.can.unlock) return { ...none, primary: null, note: 'This ticket is closed.' };
  return ticket.isUnlocked
    ? { ...none, primary: null, note: 'Unlocked for editing. Saving costs locks it again.' }
    : { ...none, primary: { kind: 'unlock', label: 'Unlock ticket' }, note: null };
}

/** Why there is no forward button on an open ticket. */
function openNote(ticket: RepairTicket, moves: TicketMove[], holdsVerify: boolean): string {
  if (ticket.status === 'FOR_VERIFICATION') {
    // Spec 0015, AC-16: the same words as the server's 403 for a verifier assigned to the ticket
    return holdsVerify && ticket.can.work && !ticket.can.verify ? SELF_VERIFY_REASON : 'Waiting for verification.';
  }
  if (ticket.status === 'OPEN') return 'No mechanic yet.';
  if (moves.length === 0 && !ticket.can.work && !ticket.can.administer) return 'This ticket is assigned to someone else.';
  return 'No next step for this status.';
}

/** Spec 0015, AC-5: the same words as the server's 422. */
export const COSTS_REQUIRED_REASON = 'Add the costs before closing this ticket.';

export const SELF_VERIFY_REASON = "Someone else must verify work on a ticket you're assigned to.";

/** `holdsVerify` is the caller's `ticket.verify` right, so a verifier assigned to the ticket sees why they can't close it. */
export function ticketActions(ticket: RepairTicket, holdsVerify = false): TicketActions {
  if (isClosed(ticket)) return finishedActions(ticket);
  const moves = ticket.moves ?? [];
  const forward = moves.find((m) => m.kind === 'forward') ?? null;
  // Spec 0016, AC-18: an Open ticket has no status move forward; assigning is its next action,
  // derived from the status and the flag because M1 carries no label
  const assign = !forward && ticket.status === 'OPEN' && ticket.can.assign;
  return {
    primary: forward ? { kind: 'move', move: forward } : assign ? { kind: 'assign', label: 'Assign mechanic' } : null,
    secondary: moves.find((m) => m.kind === 'back') ?? null,
    cancel: moves.find((m) => m.kind === 'cancel') ?? null,
    note: forward || assign ? null : openNote(ticket, moves, holdsVerify),
    // The server sends needs 'costs' on the close while the setting is on; it still refuses with no costs
    blocked: forward?.needs === 'costs' && !hasCosts(ticket) ? COSTS_REQUIRED_REASON : null,
  };
}

/** The primary move's target, for the callouts in its dialog (AC-15). */
export function primaryTarget(actions: TicketActions) {
  return actions.primary?.kind === 'move' ? actions.primary.move.to : null;
}

/** Matches the server: costs open at For verification, and on a closed ticket only while unlocked. */
export function canEditCosts(ticket: RepairTicket) {
  return ticket.can.editCosts && (ticket.status === 'FOR_VERIFICATION' || (isClosed(ticket) && !!ticket.isUnlocked));
}

/** Steps and known fixes: the caller's own ticket, or any with administer (spec 0011, AC-12). */
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
