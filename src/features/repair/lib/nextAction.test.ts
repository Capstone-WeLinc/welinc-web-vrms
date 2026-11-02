import { describe, expect, it } from 'vitest';
import { ticket } from '../../../test/ticketFixture';
import type { TicketCan, TicketMove } from '../../../types';
import { canEditCosts, canWorkTicket, hasCosts, PHOTOS_UPLOADING_REASON, primaryTarget, ticketActions } from './nextAction';

// Spec 0014, AC-15: the page's actions come from ticket.moves only, so it never offers a move
// the server rejects. Spec 0011's flags still drive Unlock, costs and the steps.

const NONE: TicketCan = { work: false, administer: false, verify: false, editCosts: false, unlock: false, assign: false };
const WORKER: TicketCan = { ...NONE, work: true };
const ADMIN: TicketCan = { work: false, administer: true, verify: true, editCosts: true, unlock: true, assign: false };

const START: TicketMove = { to: 'IN_PROGRESS', label: 'Start work', kind: 'forward', needs: null };
const VERIFY: TicketMove = { to: 'CLOSED', label: 'Verify and close', kind: 'forward', needs: null };
const RETURN: TicketMove = { to: 'IN_PROGRESS', label: 'Return to mechanic', kind: 'back', needs: 'remarks' };
const CANCEL: TicketMove = { to: 'CANCELLED', label: 'Cancel ticket', kind: 'cancel', needs: 'cancellationReason' };

describe('ticketActions', () => {
  it('makes the forward move primary and Cancel its own action', () => {
    const actions = ticketActions(ticket({ status: 'ASSIGNED', can: ADMIN, moves: [START, CANCEL] }));
    expect(actions).toEqual({ primary: { kind: 'move', move: START }, secondary: null, cancel: CANCEL, note: null, blocked: null });
    expect(primaryTarget(actions)).toBe('IN_PROGRESS');
  });

  it('puts Return to mechanic beside Verify at For verification', () => {
    const actions = ticketActions(ticket({ status: 'FOR_VERIFICATION', can: ADMIN, moves: [VERIFY, RETURN, CANCEL] }));
    expect(actions.primary).toEqual({ kind: 'move', move: VERIFY });
    expect(actions.secondary).toBe(RETURN);
  });

  it('reads "Waiting for verification." at For verification with no move', () => {
    expect(ticketActions(ticket({ status: 'FOR_VERIFICATION', can: WORKER, moves: [] }))).toEqual({
      primary: null,
      secondary: null,
      cancel: null,
      note: 'Waiting for verification.',
      blocked: null,
    });
  });

  it('offers nothing the server did not send, whatever the flags say', () => {
    const actions = ticketActions(ticket({ status: 'IN_PROGRESS', can: ADMIN, moves: [] }));
    expect(actions.primary).toBeNull();
    expect(actions.cancel).toBeNull();
    // A list row carries no moves at all
    expect(ticketActions(ticket({ status: 'IN_PROGRESS', can: ADMIN })).primary).toBeNull();
  });

  it("shows another mechanic's ticket as view only", () => {
    expect(ticketActions(ticket({ status: 'ASSIGNED', can: NONE, moves: [] })).note).toBe('This ticket is assigned to someone else.');
  });

  it('offers unlock with the unlock flag on a finished locked ticket, and only a note otherwise', () => {
    for (const status of ['CLOSED', 'CANCELLED'] as const) {
      expect(ticketActions(ticket({ status, can: ADMIN, moves: [] })).primary).toEqual({ kind: 'unlock', label: 'Unlock ticket' });
      expect(ticketActions(ticket({ status, can: WORKER, moves: [] })).note).toBe('This ticket is closed.');
    }
    const unlocked = ticketActions(ticket({ status: 'CLOSED', isUnlocked: true, can: ADMIN }));
    expect(unlocked.primary).toBeNull();
    expect(unlocked.note).toBe('Unlocked for editing. Saving costs locks it again.');
  });
});

describe('ticketActions, self verification (spec 0015, AC-16)', () => {
  const own = ticket({ status: 'FOR_VERIFICATION', can: WORKER, moves: [] });
  it('tells a verifier assigned to the ticket why they cannot close it', () => {
    expect(ticketActions(own, true).note).toBe("Someone else must verify work on a ticket you're assigned to.");
  });
  it('keeps the plain note for a mechanic without the verify right', () => {
    expect(ticketActions(own, false).note).toBe('Waiting for verification.');
  });
  it('keeps the plain note when the verifier is not assigned to the ticket', () => {
    const other = ticket({ status: 'FOR_VERIFICATION', can: { ...WORKER, verify: true }, moves: [] });
    expect(ticketActions(other, true).note).toBe('Waiting for verification.');
  });
  it('only swaps the note at For verification', () => {
    const early = ticket({ status: 'IN_PROGRESS', can: WORKER, moves: [] });
    expect(ticketActions(early, true).note).toBe('No next step for this status.');
  });
});

describe('ticketActions, costs before closing (spec 0015, AC-5)', () => {
  const NEEDS_COSTS: TicketMove = { ...VERIFY, needs: 'costs' };

  it('blocks Verify and close with the reason while the ticket has no costs', () => {
    const actions = ticketActions(ticket({ status: 'FOR_VERIFICATION', can: ADMIN, moves: [NEEDS_COSTS, RETURN] }));
    expect(actions.primary).toEqual({ kind: 'move', move: NEEDS_COSTS });
    expect(actions.blocked).toBe('Add the costs before closing this ticket.');
  });

  it('lets it through once a cost is recorded', () => {
    const actions = ticketActions(ticket({ status: 'FOR_VERIFICATION', can: ADMIN, moves: [NEEDS_COSTS], totalCost: 10 }));
    expect(actions.blocked).toBeNull();
  });
});

describe('canEditCosts', () => {
  it('opens at For verification with the editCosts flag', () => {
    expect(canEditCosts(ticket({ status: 'FOR_VERIFICATION', can: ADMIN }))).toBe(true);
    expect(canEditCosts(ticket({ status: 'FOR_VERIFICATION', can: WORKER }))).toBe(false);
    expect(canEditCosts(ticket({ status: 'IN_PROGRESS', can: ADMIN }))).toBe(false);
  });

  it('reopens on a closed ticket only while unlocked', () => {
    expect(canEditCosts(ticket({ status: 'CLOSED', can: ADMIN }))).toBe(false);
    expect(canEditCosts(ticket({ status: 'CLOSED', isUnlocked: true, can: ADMIN }))).toBe(true);
  });
});

describe('canWorkTicket', () => {
  it('is work or administer, never neither', () => {
    expect(canWorkTicket(ticket({ can: WORKER }))).toBe(true);
    expect(canWorkTicket(ticket({ can: ADMIN }))).toBe(true);
    expect(canWorkTicket(ticket({ can: NONE }))).toBe(false);
  });
});

describe('hasCosts', () => {
  it('counts a stored 0 as a cost', () => {
    expect(hasCosts(ticket())).toBe(false);
    expect(hasCosts(ticket({ totalCost: 0 }))).toBe(true);
    expect(hasCosts(ticket({ partsCost: null, laborCost: null, totalCost: null }))).toBe(false);
  });
});

// Spec 0016, AC-18: Assign mechanic comes from the status and the assign flag, not from moves
describe('ticketActions on an Open ticket', () => {
  const ASSIGNER: TicketCan = { ...NONE, assign: true };

  it('offers Assign mechanic to someone who may assign', () => {
    const actions = ticketActions(ticket({ status: 'OPEN', can: ASSIGNER, moves: [CANCEL] }));
    expect(actions.primary).toEqual({ kind: 'assign', label: 'Assign mechanic' });
    expect(actions.note).toBeNull();
    expect(actions.cancel).toBe(CANCEL);
  });

  it('offers no button without the flag, and says there is no mechanic yet', () => {
    const actions = ticketActions(ticket({ status: 'OPEN', can: NONE, moves: [] }));
    expect(actions.primary).toBeNull();
    expect(actions.note).toBe('No mechanic yet.');
  });

  it('never offers it once the ticket is Assigned', () => {
    expect(ticketActions(ticket({ status: 'ASSIGNED', can: ASSIGNER, moves: [] })).primary).toBeNull();
  });
});

describe('photo rules on the primary move (spec 0018, AC-4 to AC-6, AC-20)', () => {
  const SEND: TicketMove = { to: 'FOR_VERIFICATION', label: 'Send for verification', kind: 'forward', needs: null };

  it('gives each blocked move its reason text', () => {
    const start = ticketActions(ticket({ status: 'ASSIGNED', can: WORKER, moves: [{ ...START, blockedBy: 'beforePhoto' }] }));
    expect(start.blocked).toBe('Add a before photo first.');
    const send = ticketActions(ticket({ status: 'IN_PROGRESS', can: WORKER, moves: [{ ...SEND, blockedBy: 'afterPhoto' }] }));
    expect(send.blocked).toBe('Add an after photo first.');
    const close = ticketActions(ticket({ status: 'FOR_VERIFICATION', can: ADMIN, moves: [{ ...VERIFY, blockedBy: 'afterPhoto' }] }));
    expect(close.blocked).toBe('Add an after photo before closing.');
  });

  it('shows the photo reason before the costs reason, as it is fixed outside the dialog', () => {
    const close = ticketActions(ticket({ status: 'FOR_VERIFICATION', can: ADMIN, moves: [{ ...VERIFY, needs: 'costs', blockedBy: 'afterPhoto' }] }));
    expect(close.blocked).toBe('Add an after photo before closing.');
  });

  it('holds Start work while photos are still uploading, and nothing else', () => {
    expect(ticketActions(ticket({ status: 'ASSIGNED', can: WORKER, moves: [START] }), false, true).blocked).toBe(PHOTOS_UPLOADING_REASON);
    expect(ticketActions(ticket({ status: 'IN_PROGRESS', can: WORKER, moves: [SEND] }), false, true).blocked).toBeNull();
  });
});
