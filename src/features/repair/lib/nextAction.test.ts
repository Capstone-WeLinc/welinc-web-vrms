import { describe, expect, it } from 'vitest';
import { ticket } from '../../../test/ticketFixture';
import type { TicketCan } from '../../../types';
import { canCancel, canEditCosts, canWorkTicket, hasActionButton, hasCosts, nextAction } from './nextAction';

// Spec 0004 AC-14 in the spec 0010 shape, on the spec 0011 ticket flags: the page never offers a
// move the server rejects.

const NONE: TicketCan = { work: false, administer: false, editCosts: false, unlock: false };
const WORKER: TicketCan = { ...NONE, work: true };
const ADMIN: TicketCan = { work: false, administer: true, editCosts: true, unlock: true };

describe('nextAction', () => {
  it.each([
    ['ASSIGNED', 'Start work', 'IN_PROGRESS'],
    ['IN_PROGRESS', 'Send for verification', 'FOR_VERIFICATION'],
  ] as const)('%s offers "%s" with work or administer', (status, label, to) => {
    for (const can of [WORKER, ADMIN]) {
      expect(nextAction(ticket({ status, can }))).toEqual({ kind: 'move', label, to });
    }
  });

  it('lets only administer verify and close (AC-4, spec 0011 AC-12)', () => {
    expect(nextAction(ticket({ status: 'FOR_VERIFICATION', can: ADMIN }))).toEqual({
      kind: 'move',
      label: 'Verify and close',
      to: 'CLOSED',
    });
    expect(nextAction(ticket({ status: 'FOR_VERIFICATION', can: WORKER }))).toMatchObject({
      kind: 'note',
      text: 'Waiting for an admin to sign off.',
    });
  });

  it('acts as administer when the caller has both', () => {
    const t = ticket({ status: 'FOR_VERIFICATION', can: { ...ADMIN, work: true } });
    expect(nextAction(t)).toMatchObject({ kind: 'move', to: 'CLOSED' });
  });

  it("shows another mechanic's ticket as view only (spec 0011, AC-12)", () => {
    expect(nextAction(ticket({ status: 'ASSIGNED', can: NONE }))).toEqual({
      kind: 'note',
      text: 'This ticket is assigned to someone else.',
    });
  });

  it('offers unlock with the unlock flag on a finished locked ticket, and only a note otherwise', () => {
    for (const status of ['CLOSED', 'CANCELLED'] as const) {
      expect(nextAction(ticket({ status, can: ADMIN }))).toEqual({ kind: 'unlock', label: 'Unlock ticket' });
      expect(nextAction(ticket({ status, can: WORKER }))).toMatchObject({ kind: 'note' });
    }
    expect(nextAction(ticket({ status: 'CLOSED', isUnlocked: true, can: ADMIN })).kind).toBe('note');
  });

  it('has no move for statuses the flow does not drive yet', () => {
    for (const status of ['OPEN', 'ON_HOLD', 'OUTSOURCED', 'PENDING_APPROVAL'] as const) {
      expect(nextAction(ticket({ status, can: ADMIN }))).toMatchObject({ kind: 'note' });
    }
  });

  it('shows a button only for move and unlock', () => {
    expect(hasActionButton({ kind: 'note', text: 'x' })).toBe(false);
    expect(hasActionButton({ kind: 'unlock', label: 'x' })).toBe(true);
  });
});

describe('canCancel', () => {
  it('is for administer on open tickets only', () => {
    expect(canCancel(ticket({ status: 'IN_PROGRESS', can: ADMIN }))).toBe(true);
    expect(canCancel(ticket({ status: 'IN_PROGRESS', can: WORKER }))).toBe(false);
    expect(canCancel(ticket({ status: 'CLOSED', can: ADMIN }))).toBe(false);
    expect(canCancel(ticket({ status: 'CANCELLED', can: ADMIN }))).toBe(false);
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
