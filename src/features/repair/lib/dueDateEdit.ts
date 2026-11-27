import { z } from 'zod';
import { EDIT_REASON_MAX, EDIT_REASON_MIN } from './ticketEdits';

// Spec 0030, AC-8 and AC-9: the Change due date dialog's rules. The server checks the same
// range against its own clock and wins; these only catch the obvious mistakes before a save.

const HOUR_MS = 60 * 60 * 1000;
export const MAX_MANUAL_DAYS = 90;

export type DueDateMode = 'manual' | 'automatic';

const reason = z
  .string()
  .trim()
  .min(EDIT_REASON_MIN, `Say why, in ${EDIT_REASON_MIN} to ${EDIT_REASON_MAX} characters.`)
  .max(EDIT_REASON_MAX, `Say why, in ${EDIT_REASON_MIN} to ${EDIT_REASON_MAX} characters.`);

/** `now` is passed in so the rule is testable; the dialog passes the time it opened. */
export function dueDateSchema(now: number) {
  return z
    .object({ mode: z.enum(['manual', 'automatic']), dueAt: z.string(), reason })
    .superRefine((values, ctx) => {
      if (values.mode !== 'manual') return;
      const time = new Date(values.dueAt).getTime();
      if (!values.dueAt || Number.isNaN(time)) {
        ctx.addIssue({ code: 'custom', path: ['dueAt'], message: 'Enter a date and time.' });
      } else if (time <= now) {
        ctx.addIssue({ code: 'custom', path: ['dueAt'], message: 'Pick a time after now.' });
      } else if (time > now + MAX_MANUAL_DAYS * 24 * HOUR_MS) {
        ctx.addIssue({ code: 'custom', path: ['dueAt'], message: `Pick a time at most ${MAX_MANUAL_DAYS} days away.` });
      }
    });
}
export type DueDateValues = z.infer<ReturnType<typeof dueDateSchema>>;

/** A `datetime-local` value (the browser's time zone) as ISO with an offset, as the server needs. */
export function localToIso(local: string): string {
  return new Date(local).toISOString();
}

/** "Brakes 6 h" style hours, without trailing zeros. */
export function hoursLabel(hours: number): string {
  return `${Math.round(hours * 100) / 100} h`;
}

const FROM_TEXT = {
  KNOWLEDGE: 'from past repairs',
  ESTIMATE: 'the known fix’s estimate',
  CATEGORY: 'the system’s fix time',
  NONE: 'no time set',
} as const;

export function hoursFromText(from: keyof typeof FROM_TEXT): string {
  return FROM_TEXT[from];
}
