import { z } from 'zod';
import type { DeletionRequest } from '../../../lib/api/authApi';

// Suite spec 0012, AC-22: the My profile Delete account card and its dialog.

export const DELETION_REASON_MAX = 500;

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Enter your password.'),
  reason: z.string().max(DELETION_REASON_MAX, `Keep it under ${DELETION_REASON_MAX} characters.`),
});

export type DeleteAccountValues = z.infer<typeof deleteAccountSchema>;

const MANILA_DAY = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

/** `November 12, 2026`, in Asia/Manila whatever the device's zone; a dash for a bad date. */
export function formatManilaDay(value: string | Date): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? MANILA_DAY.format(date) : '—';
}

/** What the card shows: ask, a pending request with Cancel, or a rejection with its note. */
export type DeletionCardState =
  | { kind: 'none' }
  | { kind: 'pending'; requestedAt: string }
  | { kind: 'rejected'; note: string | null; decidedAt: string | null };

export function deletionCardState(request: DeletionRequest | null): DeletionCardState {
  if (request?.status === 'PENDING') return { kind: 'pending', requestedAt: request.requestedAt };
  if (request?.status === 'REJECTED') return { kind: 'rejected', note: request.decisionNote, decidedAt: request.decidedAt };
  // Cancelled, restored or nothing yet: you may ask (again) at once (AC-7)
  return { kind: 'none' };
}

/** What happens next, in the dialog (AC-22). The grace length is the suite default. */
export const DELETION_STEPS = [
  'An admin of your systems reviews your request. Until then everything works as usual.',
  'Once it is approved you can’t sign in to any WeLinc system.',
  '30 days later your name, email, phone and picture are erased. Records that mention you will say “Deleted user”.',
] as const;
