import { describe, expect, it } from 'vitest';
import type { RepairIssue } from '../../../types';
import { hasSavedResolution, noteFormSchema, noteLongEnough, resolutionDefaults } from './resolutionForm';

// Spec 0014: the prefilled resend (AC-18), the kept notes after a Return to mechanic (AC-21) and the
// Return to mechanic comment's limits (AC-16).

function issue(overrides: Partial<RepairIssue> = {}): RepairIssue {
  return {
    id: 'i1',
    description: '[Brakes] Pads: squeal',
    categoryId: 'cat',
    categoryName: 'Brakes',
    knowledgeEntry: null,
    steps: [],
    resolutionNote: null,
    hoursSpent: null,
    followedKnownFix: null,
    resolvedAt: null,
    ...overrides,
  };
}

const LINKED = {
  id: 'k1',
  name: 'Replace pads',
  status: 'ACTIVE' as const,
  safetyNotes: null,
  parts: [],
  typicalHours: null,
  estimatedHours: null,
};

describe('resolutionDefaults (AC-18)', () => {
  it('fills each issue with its saved note, hours and followed choice', () => {
    const rows = resolutionDefaults([
      issue({ resolutionNote: 'Replaced rear pads', hoursSpent: 1.5 }),
      issue({ id: 'i2', knowledgeEntry: LINKED, followedKnownFix: false }),
    ]);
    expect(rows).toEqual([
      { issueId: 'i1', linked: false, followedKnownFix: true, resolutionNote: 'Replaced rear pads', hoursSpent: '1.5' },
      { issueId: 'i2', linked: true, followedKnownFix: false, resolutionNote: '', hoursSpent: '' },
    ]);
  });

  it('still ticks "Followed the known fix" on a linked issue with no saved choice', () => {
    expect(resolutionDefaults([issue({ knowledgeEntry: LINKED })])[0].followedKnownFix).toBe(true);
  });
});

describe('hasSavedResolution (AC-21)', () => {
  it('shows a resolved issue, and a returned one whose notes were kept', () => {
    expect(hasSavedResolution(issue({ resolvedAt: '2026-10-31T00:00:00.000Z' }))).toBe(true);
    expect(hasSavedResolution(issue({ resolutionNote: 'Replaced pads' }))).toBe(true);
    expect(hasSavedResolution(issue({ hoursSpent: 2 }))).toBe(true);
    expect(hasSavedResolution(issue())).toBe(false);
  });
});

describe('the Return to mechanic comment (AC-16)', () => {
  it('needs 5 to 500 characters after trimming', () => {
    expect(noteLongEnough(' ok  ', 5)).toBe(false);
    expect(noteLongEnough('Rear pads still squeal', 5)).toBe(true);
    expect(noteLongEnough('x'.repeat(501), 5)).toBe(false);
  });

  it('fails the form with the required message under the minimum', () => {
    const schema = noteFormSchema('Say what needs fixing.', 5);
    const result = schema.safeParse({ note: 'abc', resolutions: [] });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Say what needs fixing.');
    expect(schema.safeParse({ note: 'Squeals again', resolutions: [] }).success).toBe(true);
  });

  it('counts the limit after trimming, so a pasted paragraph with a trailing newline passes (spec 0020, AC-1)', () => {
    const schema = noteFormSchema('Give a reason.', 5);
    const body = 'x'.repeat(500);
    expect(schema.safeParse({ note: `${body}\n`, resolutions: [] }).success).toBe(true);
    expect(schema.safeParse({ note: `  ${body}  `, resolutions: [] }).success).toBe(true);
    const over = schema.safeParse({ note: `${body}y`, resolutions: [] });
    expect(over.success).toBe(false);
    expect(over.error?.issues[0].message).toBe('Keep it to 500 characters or fewer.');
  });
});
