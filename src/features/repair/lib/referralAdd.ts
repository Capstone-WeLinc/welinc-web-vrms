import { z } from 'zod';
import type { ReferralDetail, ReferralIssueLine } from '../../../lib/api/referralsApi';
import { findingDescription } from './referralPrefill';
import { ISSUE_TEXT_MAX } from './ticketEdits';

// Spec 0029 (child 0002), AC-9: "Add to REP-…" turns each finding into an issue line on the
// truck's open ticket. The text is prefilled from the finding; the Admin picks each system.

export const referralAddSchema = z.object({
  issues: z
    .array(
      z.object({
        categoryId: z.string().min(1, 'Choose a system.'),
        description: z
          .string()
          .trim()
          .min(1, 'Describe the issue.')
          .max(ISSUE_TEXT_MAX, `Keep it under ${ISSUE_TEXT_MAX} characters.`),
      }),
    )
    .min(1),
});

export type ReferralAddValues = z.input<typeof referralAddSchema>;

export function referralAddDefaults(referral: ReferralDetail): ReferralAddValues {
  return {
    issues: referral.findings.map((finding) => ({
      categoryId: '',
      description: findingDescription(finding),
    })),
  };
}

export function toIssueLines(values: ReferralAddValues): ReferralIssueLine[] {
  return values.issues.map((line) => ({ categoryId: line.categoryId, description: line.description.trim() }));
}
