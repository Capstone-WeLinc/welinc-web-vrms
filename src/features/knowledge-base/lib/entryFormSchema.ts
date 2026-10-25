import type { Control } from 'react-hook-form';
import { z } from 'zod';
import type { EntryFields, KnowledgeEntryDetail, RepairPriority } from '../../../lib/api/knowledgeApi';

// Spec 0007, AC-17 and AC-18. The limits match entry-fields.dto.ts in welinc-backend-vrms.

export const MAX_STEPS = 20;
export const MAX_PARTS = 20;
export const NAME_LIMIT = 100;
export const SYMPTOMS_LIMIT = 1000;
export const TEMPLATE_LIMIT = 1000;
export const SAFETY_LIMIT = 500;
export const STEP_LIMIT = 300;
export const PART_LIMIT = 100;

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

/**
 * Rows of a list: empty ones are dropped before the count is checked, and a row's own error
 * stays on that row. `none` is the message for no rows at all (null when none is fine).
 */
function rowList(opts: { min: number; max: number; none: string | null; tooMany: string; short: number; long: number; rowMessage: string }) {
  return z
    .array(z.object({ text: z.string() }))
    .superRefine((rows, ctx) => {
      let filled = 0;
      rows.forEach((row, index) => {
        const text = row.text.trim();
        if (!text) return;
        filled += 1;
        if (text.length < opts.short || text.length > opts.long) {
          ctx.addIssue({ code: 'custom', message: opts.rowMessage, path: [index, 'text'] });
        }
      });
      if (filled < opts.min && opts.none) ctx.addIssue({ code: 'custom', message: opts.none, path: [] });
      if (filled > opts.max) ctx.addIssue({ code: 'custom', message: opts.tooMany, path: [] });
    })
    .transform((rows) => rows.map((row) => row.text.trim()).filter(Boolean));
}

export const entryFormSchema = z.object({
  name: z.string().trim().min(3, 'Name must be 3 to 100 characters.').max(NAME_LIMIT, 'Name must be 3 to 100 characters.'),
  categoryId: z.string().min(1, 'Choose a category.'),
  suggestedPriority: z.string().refine((v) => (PRIORITIES as readonly string[]).includes(v), 'Choose a suggested priority.'),
  estimatedHours: z
    .string()
    .trim()
    .refine((v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0.25 && Number(v) <= 200), 'Estimated hours must be 0.25 to 200.')
    .refine((v) => v === '' || Number.isInteger(Number(v) * 4), 'Estimated hours go in steps of 0.25.')
    .transform((v) => (v === '' ? null : Number(v))),
  symptoms: z.string().trim().min(10, 'Symptoms must be 10 to 1000 characters.').max(SYMPTOMS_LIMIT, 'Symptoms must be 10 to 1000 characters.'),
  descriptionTemplate: z.string().trim().max(TEMPLATE_LIMIT, 'The description template can be up to 1000 characters.'),
  safetyNotes: z.string().trim().max(SAFETY_LIMIT, 'Safety notes can be up to 500 characters.'),
  steps: rowList({
    min: 1,
    max: MAX_STEPS,
    none: 'Add at least one fix step.',
    tooMany: 'An entry can have up to 20 fix steps.',
    short: 3,
    long: STEP_LIMIT,
    rowMessage: 'Each fix step must be 3 to 300 characters.',
  }),
  parts: rowList({
    min: 0,
    max: MAX_PARTS,
    none: null,
    tooMany: 'An entry can have up to 20 parts.',
    short: 2,
    long: PART_LIMIT,
    rowMessage: 'Each part must be 2 to 100 characters.',
  }),
});

export type EntryFormInput = z.input<typeof entryFormSchema>;
export type EntryFormValues = z.output<typeof entryFormSchema>;
export type EntryFormControl = Control<EntryFormInput, unknown, EntryFormValues>;

export const EMPTY_ENTRY_FORM: EntryFormInput = {
  name: '',
  categoryId: '',
  suggestedPriority: '',
  estimatedHours: '',
  symptoms: '',
  descriptionTemplate: '',
  safetyNotes: '',
  steps: [{ text: '' }],
  parts: [],
};

/** The editor's starting values for an existing entry. */
export function entryToForm(entry: KnowledgeEntryDetail): EntryFormInput {
  return {
    name: entry.name,
    categoryId: entry.category.id,
    suggestedPriority: entry.suggestedPriority,
    estimatedHours: entry.estimatedHours == null ? '' : String(entry.estimatedHours),
    symptoms: entry.symptoms,
    descriptionTemplate: entry.descriptionTemplate ?? '',
    safetyNotes: entry.safetyNotes ?? '',
    steps: entry.steps.map((s) => ({ text: s.text })),
    parts: entry.parts.map((p) => ({ text: p.name })),
  };
}

export function toEntryFields(values: EntryFormValues): EntryFields {
  return {
    name: values.name,
    categoryId: values.categoryId,
    suggestedPriority: values.suggestedPriority as RepairPriority,
    estimatedHours: values.estimatedHours,
    symptoms: values.symptoms,
    descriptionTemplate: values.descriptionTemplate || null,
    safetyNotes: values.safetyNotes || null,
    steps: values.steps,
    parts: values.parts,
  };
}
