import { describe, expect, it } from 'vitest';
import { ticket } from '../../../test/ticketFixture';
import { detailsPayload, detailsSchema, editNeedsReason, ticketEditable } from './ticketEdits';

// Spec 0019: what the detail page offers and what the details dialog sends.

const AT = '2026-11-03T01:00:00.000Z';

describe('ticketEditable (AC-2)', () => {
  it.each(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'FOR_VERIFICATION', 'OUTSOURCED', 'PENDING_APPROVAL'] as const)(
    'is editable while %s',
    (status) => {
      expect(ticketEditable(ticket({ status }))).toBe(true);
      expect(editNeedsReason(ticket({ status }))).toBe(false);
    },
  );

  it.each(['CLOSED', 'CANCELLED'] as const)('is locked while %s, and editable with a reason once unlocked', (status) => {
    expect(ticketEditable(ticket({ status }))).toBe(false);
    expect(ticketEditable(ticket({ status, isUnlocked: false }))).toBe(false);
    expect(ticketEditable(ticket({ status, isUnlocked: true }))).toBe(true);
    expect(editNeedsReason(ticket({ status }))).toBe(true);
  });
});

describe('detailsPayload (AC-6, AC-8b)', () => {
  it('sends only the changed priority with the opened lastUpdatedAt', () => {
    expect(detailsPayload({ priority: 'HIGH', reason: '' }, ticket({ priority: 'MEDIUM' }), AT)).toEqual({
      lastUpdatedAt: AT,
      priority: 'HIGH',
    });
  });

  it('is null when nothing changed, so no request is made', () => {
    expect(detailsPayload({ priority: 'MEDIUM', reason: 'ignored' }, ticket({ priority: 'MEDIUM' }), AT)).toBeNull();
  });

  it('adds the trimmed reason on a closed ticket (AC-3)', () => {
    const closed = ticket({ status: 'CLOSED', isUnlocked: true, priority: 'LOW' });
    expect(detailsPayload({ priority: 'HIGH', reason: '  Entered wrong  ' }, closed, AT)).toEqual({
      lastUpdatedAt: AT,
      priority: 'HIGH',
      reason: 'Entered wrong',
    });
  });
});

describe('detailsSchema reason (AC-3)', () => {
  it('ignores the reason on an open ticket', () => {
    expect(detailsSchema(false).safeParse({ priority: 'LOW', reason: '' }).success).toBe(true);
  });

  it.each(['', '    ', 'abcd', 'x'.repeat(501)])('refuses %p on a closed ticket', (reason) => {
    expect(detailsSchema(true).safeParse({ priority: 'LOW', reason }).success).toBe(false);
  });

  it('takes 5 to 500 trimmed characters on a closed ticket', () => {
    expect(detailsSchema(true).safeParse({ priority: 'LOW', reason: '  abcde  ' }).success).toBe(true);
  });
});
