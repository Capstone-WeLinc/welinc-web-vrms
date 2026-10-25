import { z } from 'zod';
import type { IssueResolution, RepairIssue } from '../../../types';

// Spec 0004's note dialog, plus spec 0007's per issue "What fixed it" on the move to
// For verification (AC-30). The limits match update-repair-status.dto.ts.

/** The server's limit on remarks, cancellation and unlock reasons, and on a resolution note. */
export const NOTE_MAX = 500;

export type ResolutionRow = {
  issueId: string;
  linked: boolean;
  followedKnownFix: boolean;
  resolutionNote: string;
  /** Text in the form, a number in the payload. */
  hoursSpent: string;
};

export type NoteFormValues = { note: string; resolutions: ResolutionRow[] };

const resolutionRow = z
  .object({
    issueId: z.string(),
    linked: z.boolean(),
    followedKnownFix: z.boolean(),
    resolutionNote: z.string().max(NOTE_MAX, `Keep it to ${NOTE_MAX} characters or fewer.`),
    hoursSpent: z
      .string()
      .trim()
      .refine((v) => v === '' || (Number(v) >= 0.25 && Number(v) <= 200), 'Hours spent must be 0.25 to 200.')
      .refine((v) => v === '' || Number.isInteger(Number(v) * 4), 'Hours spent go in steps of 0.25.'),
  })
  .superRefine((row, ctx) => {
    const note = row.resolutionNote.trim();
    if (!row.linked && (note.length < 5 || note.length > NOTE_MAX)) {
      ctx.addIssue({ code: 'custom', path: ['resolutionNote'], message: 'Say what fixed it, in 5 to 500 characters.' });
    }
  });

export function noteFormSchema(requiredMessage: string | undefined) {
  return z.object({
    note: z
      .string()
      .max(NOTE_MAX, `Keep it to ${NOTE_MAX} characters or fewer.`)
      .refine((note) => !requiredMessage || note.trim() !== '', requiredMessage ?? ''),
    resolutions: z.array(resolutionRow),
  });
}

export function resolutionDefaults(issues: RepairIssue[] | undefined): ResolutionRow[] {
  return (issues ?? []).map((issue) => ({
    issueId: issue.id,
    linked: issue.knowledgeEntry != null,
    followedKnownFix: true,
    resolutionNote: '',
    hoursSpent: '',
  }));
}

/** True when every unlinked issue has a note the server accepts; the submit waits for it (AC-30). */
export function requiredNotesValid(rows: ResolutionRow[] | undefined) {
  return (rows ?? []).every((row) => {
    const length = row.resolutionNote.trim().length;
    return row.linked || (length >= 5 && length <= NOTE_MAX);
  });
}

export function toResolutions(rows: ResolutionRow[]): IssueResolution[] {
  return rows.map((row) => {
    const note = row.resolutionNote.trim();
    return {
      issueId: row.issueId,
      ...(note ? { resolutionNote: note } : {}),
      ...(row.hoursSpent.trim() ? { hoursSpent: Number(row.hoursSpent) } : {}),
      ...(row.linked ? { followedKnownFix: row.followedKnownFix } : {}),
    };
  });
}
