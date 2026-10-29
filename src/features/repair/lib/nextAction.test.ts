import { describe, expect, it } from 'vitest';
import { ticket } from '../../../test/ticketFixture';
import { canCancel, canEditCosts, hasActionButton, hasCosts, nextAction } from './nextAction';

// Spec 0004 AC-14 in the spec 0010 shape: the page never offers a move the server rejects.

describe('nextAction', () => {
  it.each([
    ['ASSIGNED', 'Start work', 'IN_PROGRESS'],
    ['IN_PROGRESS', 'Send for verification', 'FOR_VERIFICATION'],
  ] as const)('%s offers "%s" to anyone', (status, label, to) => {
    for (const isAdmin of [true, false]) {
      expect(nextAction(ticket({ status }), isAdmin)).toEqual({ kind: 'move', label, to });
    }
  });

  it('lets only an admin verify and close (AC-4)', () => {
    const t = ticket({ status: 'FOR_VERIFICATION' });
    expect(nextAction(t, true)).toEqual({ kind: 'move', label: 'Verify and close', to: 'CLOSED' });
    expect(nextAction(t, false)).toMatchObject({ kind: 'note', text: 'Waiting for an admin to sign off.' });
  });

  it('offers unlock to an admin on a finished locked ticket, and only a note otherwise', () => {
    for (const status of ['CLOSED', 'CANCELLED'] as const) {
      expect(nextAction(ticket({ status }), true)).toEqual({ kind: 'unlock', label: 'Unlock ticket' });
      expect(nextAction(ticket({ status }), false)).toMatchObject({ kind: 'note' });
    }
    expect(nextAction(ticket({ status: 'CLOSED', isUnlocked: true }), true).kind).toBe('note');
  });

  it('has no move for statuses the flow does not drive yet', () => {
    for (const status of ['OPEN', 'ON_HOLD', 'OUTSOURCED', 'PENDING_APPROVAL'] as const) {
      expect(nextAction(ticket({ status }), true)).toMatchObject({ kind: 'note' });
    }
  });

  it('shows a button only for move and unlock', () => {
    expect(hasActionButton({ kind: 'note', text: 'x' })).toBe(false);
    expect(hasActionButton({ kind: 'unlock', label: 'x' })).toBe(true);
  });
});

describe('canCancel', () => {
  it('is for admins on open tickets only', () => {
    expect(canCancel(ticket({ status: 'IN_PROGRESS' }), true)).toBe(true);
    expect(canCancel(ticket({ status: 'IN_PROGRESS' }), false)).toBe(false);
    expect(canCancel(ticket({ status: 'CLOSED' }), true)).toBe(false);
    expect(canCancel(ticket({ status: 'CANCELLED' }), true)).toBe(false);
  });
});

describe('canEditCosts', () => {
  it('opens at For verification for admins', () => {
    expect(canEditCosts(ticket({ status: 'FOR_VERIFICATION' }), true)).toBe(true);
    expect(canEditCosts(ticket({ status: 'FOR_VERIFICATION' }), false)).toBe(false);
    expect(canEditCosts(ticket({ status: 'IN_PROGRESS' }), true)).toBe(false);
  });

  it('reopens on a closed ticket only while unlocked', () => {
    expect(canEditCosts(ticket({ status: 'CLOSED' }), true)).toBe(false);
    expect(canEditCosts(ticket({ status: 'CLOSED', isUnlocked: true }), true)).toBe(true);
  });
});

describe('hasCosts', () => {
  it('counts a stored 0 as a cost', () => {
    expect(hasCosts(ticket())).toBe(false);
    expect(hasCosts(ticket({ totalCost: 0 }))).toBe(true);
    expect(hasCosts(ticket({ partsCost: null, laborCost: null, totalCost: null }))).toBe(false);
  });
});
