import { z } from 'zod';

// Spec 0006, AC-10. The limits match the database columns; the server DTOs don't check length.
// zod trims only the values handed to submit, so the text never changes while typing.

export const NAME_MAX = 100;
export const EMAIL_MAX = 255;

export const userFormSchema = z.object({
  name: z.string().trim().min(1, 'Enter their name.').max(NAME_MAX, `Keep it to ${NAME_MAX} characters.`),
  email: z
    .string()
    .trim()
    .min(1, 'Enter their email.')
    .max(EMAIL_MAX, 'Enter a valid email address.')
    .email('Enter a valid email address.'),
  // A string, not the two editable roles: a locked control keeps a role it can't set (AC-11).
  role: z.string(),
});

export type UserFormValues = z.input<typeof userFormSchema>;
export type UserFormOutput = z.output<typeof userFormSchema>;
