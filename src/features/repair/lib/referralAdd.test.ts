import { describe, expect, it } from 'vitest';
import type { ReferralDetail } from '../../../lib/api/referralsApi';
import { referralAddDefaults, referralAddSchema, toIssueLines } from './referralAdd';
import { ISSUE_TEXT_MAX } from './ticketEdits';

// Spec 0029, AC-9: "Add to REP-…" prefills one line per finding; the Admin picks each system.

const referral = {
  findings: [
    { checklistItemId: 'c1', label: 'Brake pads', note: 'Worn to 2 mm' },
    { checklistItemId: 'c2', label: 'Tail lights', note: null },
  ],
} as unknown as ReferralDetail;

describe('referralAdd (AC-9)', () => {
  it('prefills each finding as "label: note", with no system picked', () => {
    expect(referralAddDefaults(referral)).toEqual({
      issues: [
        { categoryId: '', description: 'Brake pads: Worn to 2 mm' },
        { categoryId: '', description: 'Tail lights' },
      ],
    });
  });

  it('needs a system and text on every line, within the issue length', () => {
    const blank = referralAddSchema.safeParse(referralAddDefaults(referral));
    expect(blank.success).toBe(false);
    const filled = { issues: [{ categoryId: 'cat-1', description: '  Brakes  ' }] };
    expect(referralAddSchema.safeParse(filled).success).toBe(true);
    expect(toIssueLines(filled)).toEqual([{ categoryId: 'cat-1', description: 'Brakes' }]);
    const long = { issues: [{ categoryId: 'cat-1', description: 'x'.repeat(ISSUE_TEXT_MAX + 1) }] };
    expect(referralAddSchema.safeParse(long).success).toBe(false);
  });
});
