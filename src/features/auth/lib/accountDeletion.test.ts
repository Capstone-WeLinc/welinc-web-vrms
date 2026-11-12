import { describe, expect, it } from 'vitest';
import type { DeletionRequest } from '../../../lib/api/authApi';
import {
  DELETION_REASON_MAX,
  deleteAccountSchema,
  deletionCardState,
  formatManilaDay,
} from './accountDeletion';

// covers: suite spec 0012 AC-22 (Delete account card), AC-7 (ask again at once), AC-12 (rejection note)

function request(over: Partial<DeletionRequest>): DeletionRequest {
  return {
    id: 'r1',
    status: 'PENDING',
    reason: null,
    requestedAt: '2026-11-12T10:00:00.000Z',
    decidedAt: null,
    decisionNote: null,
    eraseAfter: null,
    ...over,
  };
}

describe('deleteAccountSchema', () => {
  it('needs a password', () => {
    const result = deleteAccountSchema.safeParse({ password: '', reason: '' });
    expect(result.success).toBe(false);
  });

  it('accepts an empty reason', () => {
    expect(deleteAccountSchema.safeParse({ password: 'x', reason: '' }).success).toBe(true);
  });

  it('accepts a reason of exactly 500 characters and refuses 501', () => {
    expect(deleteAccountSchema.safeParse({ password: 'x', reason: 'a'.repeat(DELETION_REASON_MAX) }).success).toBe(true);
    expect(deleteAccountSchema.safeParse({ password: 'x', reason: 'a'.repeat(DELETION_REASON_MAX + 1) }).success).toBe(false);
  });
});

describe('formatManilaDay', () => {
  it('shows the Manila day even when UTC is still the day before', () => {
    expect(formatManilaDay('2026-11-12T20:00:00.000Z')).toBe('November 13, 2026');
  });

  it('accepts a Date', () => {
    expect(formatManilaDay(new Date('2026-11-12T01:00:00.000Z'))).toBe('November 12, 2026');
  });

  it('shows a dash for a bad date', () => {
    expect(formatManilaDay('not a date')).toBe('—');
  });
});

describe('deletionCardState', () => {
  it('lets you ask when there is no request', () => {
    expect(deletionCardState(null)).toEqual({ kind: 'none' });
  });

  it('shows a pending request with its time', () => {
    expect(deletionCardState(request({ status: 'PENDING' }))).toEqual({
      kind: 'pending',
      requestedAt: '2026-11-12T10:00:00.000Z',
    });
  });

  it('shows a rejection with the admin note', () => {
    expect(
      deletionCardState(request({ status: 'REJECTED', decisionNote: 'Not now', decidedAt: '2026-11-13T00:00:00.000Z' })),
    ).toEqual({ kind: 'rejected', note: 'Not now', decidedAt: '2026-11-13T00:00:00.000Z' });
  });

  it('lets you ask again at once after a cancel', () => {
    expect(deletionCardState(request({ status: 'CANCELLED' }))).toEqual({ kind: 'none' });
  });
});
