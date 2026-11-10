import { z } from 'zod';
import { validatePassword } from './passwordRules';

/** No email: it changes through the Change email dialog, with a code (suite spec 0009, AC-20). */
export const personalDetailsSchema = z.object({
  name: z.string().trim().min(1, 'Enter your full name.'),
  contact: z.string().trim(),
});

/** Suite spec 0009, AC-17: the first step of changing your own email. */
export const emailChangeSchema = z.object({
  newEmail: z.string().trim().min(1, 'Enter your new email address.').email('Enter a valid email address.'),
  currentPassword: z.string().min(1, 'Enter your current password.'),
});

export type EmailChangeValues = z.infer<typeof emailChangeSchema>;

/** AC-18: the code sent to the new address. */
export const emailCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6 digit code.'),
});

export type EmailCodeValues = z.infer<typeof emailCodeSchema>;

export type PersonalDetailsValues = z.infer<typeof personalDetailsSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z.string().min(1, 'Enter a new password.'),
    confirmPassword: z.string().min(1, 'Enter the new password again.'),
  })
  .superRefine(({ newPassword, confirmPassword }, ctx) => {
    // The rules welinc-auth enforces, so the form catches them before the request.
    const rule = newPassword ? validatePassword(newPassword) : null;
    if (rule) ctx.addIssue({ code: 'custom', path: ['newPassword'], message: rule });
    if (confirmPassword && newPassword !== confirmPassword) {
      ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'The two new passwords don’t match.' });
    }
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const PASSWORD_RULES_HINT =
  'At least 8 characters, with an uppercase and a lowercase letter, a number and a symbol.';
