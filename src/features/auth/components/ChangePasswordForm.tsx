import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { changeOwnPassword } from '../../../lib/api/authApi';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { passwordCheckFailure } from '../lib/passwordCheck';
import { useToast } from '../../../context/toast';
import { FormAlert } from '../../../components/shared/FormAlert';
import { PasswordInput } from '../../../components/shared/PasswordInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup, FormField } from '@/components/ui/field';
import { changePasswordSchema, PASSWORD_RULES_HINT, type ChangePasswordValues } from '../lib/profileSchemas';

const EMPTY: ChangePasswordValues = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function ChangePasswordForm() {
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, reset, setError: setFieldError, formState: { isSubmitting } } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
  });

  const onSubmit = async (values: ChangePasswordValues) => {
    setError(null);
    try {
      await changeOwnPassword(values);
      reset(EMPTY);
      showToast('Your password is changed.', 'success');
    } catch (err) {
      // Suite spec 0012, AC-2: a wrong current password shows under its field with the tries left
      const password = passwordCheckFailure(err);
      if (password?.kind === 'wrong') setFieldError('currentPassword', { message: password.message }, { shouldFocus: true });
      else setError(password?.message ?? getApiErrorMessage(err, 'We couldn’t change your password. Try again.'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Change password</CardTitle>
        <CardDescription>Pick one you don’t use for anything else.</CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <FieldGroup className="gap-5">
            <FormField
              control={control}
              name="currentPassword"
              label="Current password"
              required
              render={({ field, controlProps }) => (
                <PasswordInput {...field} {...controlProps} autoComplete="current-password" />
              )}
            />
            <FormField
              control={control}
              name="newPassword"
              label="New password"
              required
              description={PASSWORD_RULES_HINT}
              render={({ field, controlProps }) => (
                <PasswordInput {...field} {...controlProps} autoComplete="new-password" />
              )}
            />
            <FormField
              control={control}
              name="confirmPassword"
              label="Confirm new password"
              required
              render={({ field, controlProps }) => (
                <PasswordInput {...field} {...controlProps} autoComplete="new-password" />
              )}
            />
          </FieldGroup>

          {error && <FormAlert message={error} />}

          <div className="flex justify-end">
            <Button type="submit" className="w-full sm:w-auto" loading={isSubmitting}>
              {isSubmitting ? 'Changing password' : 'Change password'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
