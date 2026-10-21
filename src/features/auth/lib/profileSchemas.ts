import { z } from 'zod';
import { validatePassword } from '../../user-management/hooks/useUsersManager';

export const personalDetailsSchema = z.object({
  name: z.string().trim().min(1, 'Enter your full name.'),
  email: z.string().trim().min(1, 'Enter your email address.').email('Enter a valid email address.'),
  contact: z.string().trim(),
});

export type PersonalDetailsValues = z.infer<typeof personalDetailsSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z.string().min(1, 'Enter a new password.'),
    confirmPassword: z.string().min(1, 'Enter the new password again.'),
  })
  .superRefine(({ newPassword, confirmPassword }, ctx) => {
    // Same rules the admin user form uses, so both places agree.
    const rule = newPassword ? validatePassword(newPassword) : null;
    if (rule) ctx.addIssue({ code: 'custom', path: ['newPassword'], message: rule });
    if (confirmPassword && newPassword !== confirmPassword) {
      ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'The two new passwords don’t match.' });
    }
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const PASSWORD_RULES_HINT =
  'At least 8 characters, with an uppercase and a lowercase letter, a number and a symbol.';
