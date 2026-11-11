import { useId, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { FieldGroup, FormField } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { FormAlert } from '../../../components/shared/FormAlert';
import { PasswordInput } from '../../../components/shared/PasswordInput';
import { ResponsiveDialog } from '../../../components/shared/ResponsiveDialog';
import { requestAccountDeletion, verifyPassword, type DeletionRequest } from '../../../lib/api/authApi';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { passwordCheckFailure } from '../lib/passwordCheck';
import {
  DELETION_REASON_MAX,
  DELETION_STEPS,
  deleteAccountSchema,
  type DeleteAccountValues,
} from '../lib/accountDeletion';

type DeleteAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequested: (request: DeletionRequest) => void;
};

/** Server codes the dialog explains in its own words (AC-5). */
function requestFailure(err: unknown): string {
  const code = isAxiosError<{ code?: string }>(err) ? err.response?.data?.code : undefined;
  if (code === 'DELETION_PENDING') return 'You already asked to delete your account. Reload the page to see it.';
  if (code === 'LAST_ADMIN') {
    return 'You are the last admin of one of your systems. Make someone else an admin first, then ask again.';
  }
  if (code === 'REAUTH_REQUIRED') return 'That took too long. Enter your password again.';
  return getApiErrorMessage(err, 'We couldn’t send your request. Try again.');
}

/**
 * Give it a new `key` on each opening. Suite spec 0012, AC-22: your password, an optional reason
 * with a counter, and what happens next. It checks the password first, then sends the request.
 */
export function DeleteAccountDialog({ open, onOpenChange, onRequested }: DeleteAccountDialogProps) {
  const formId = useId();
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError: setFieldError,
    formState: { isSubmitting },
  } = useForm<DeleteAccountValues>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { password: '', reason: '' },
  });
  const reason = useWatch({ control, name: 'reason' });

  const onSubmit = async (values: DeleteAccountValues) => {
    setError(null);
    let token: string;
    try {
      token = (await verifyPassword(values.password)).reauthToken;
    } catch (err) {
      const password = passwordCheckFailure(err);
      if (password?.kind === 'wrong') {
        setFieldError('password', { message: password.message }, { shouldFocus: true });
      } else {
        setError(password?.message ?? getApiErrorMessage(err, 'We couldn’t check your password. Try again.'));
      }
      return;
    }
    try {
      onRequested(await requestAccountDeletion(token, values.reason));
    } catch (err) {
      setError(requestFailure(err));
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => !isSubmitting && onOpenChange(next)}
      title="Delete your account?"
      description="This asks an admin to delete your WeLinc account in every system you use."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Keep my account
          </Button>
          <Button type="submit" form={formId} variant="destructive" loading={isSubmitting}>
            {isSubmitting ? 'Sending request' : 'Ask to delete'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div>
          <h3 className="text-sm font-medium">What happens next</h3>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            {DELETION_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
        <FieldGroup className="gap-5">
          <FormField
            control={control}
            name="password"
            label="Your password"
            required
            render={({ field, controlProps }) => (
              <PasswordInput {...field} {...controlProps} autoComplete="current-password" />
            )}
          />
          <FormField
            control={control}
            name="reason"
            label="Reason (optional)"
            description={`${reason.length} of ${DELETION_REASON_MAX} characters. Admins see what you write.`}
            render={({ field, controlProps }) => (
              <Textarea {...field} {...controlProps} rows={3} maxLength={DELETION_REASON_MAX} />
            )}
          />
        </FieldGroup>
        {error && <FormAlert message={error} />}
      </form>
    </ResponsiveDialog>
  );
}
