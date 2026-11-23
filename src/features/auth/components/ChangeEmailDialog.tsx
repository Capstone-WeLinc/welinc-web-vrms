import { useEffect, useId, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Button } from '@/components/ui/button';
import { FieldGroup, FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { FormAlert } from '../../../components/shared/FormAlert';
import { PasswordInput } from '../../../components/shared/PasswordInput';
import { ResponsiveDialog } from '../../../components/shared/ResponsiveDialog';
import { cancelEmailChange, startEmailChange, verifyEmailChange } from '../../../lib/api/authApi';
import type { ManagedUser } from '../../../types';
import { emailChangeFailure } from '../lib/emailChange';
import {
  emailChangeSchema,
  emailCodeSchema,
  type EmailChangeValues,
  type EmailCodeValues,
} from '../lib/profileSchemas';

type ChangeEmailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
  /** A change waiting for its code: the dialog opens on the code step (Enter code). */
  pendingEmail: string | null;
  /** The pending address after a start or a cancel, so the profile can show it. */
  onPendingChange: (pendingEmail: string | null) => void;
  /** The code was right: the answer is the profile with the new email. */
  onChanged: (user: ManagedUser) => void;
};

const CODE_LENGTH = 6;

/**
 * Give it a new `key` on each opening, so it starts from its props: on the code step for a
 * pending change, else on the details.
 *
 * Suite spec 0009, AC-27: change your own email. First the new address and your password, then
 * the code sent to it. Your email stays the same until the code is used; the old address is told
 * both times. The password is kept in memory while the dialog is open, only to resend.
 */
export function ChangeEmailDialog({
  open,
  onOpenChange,
  currentEmail,
  pendingEmail,
  onPendingChange,
  onChanged,
}: ChangeEmailDialogProps) {
  const formId = useId();
  const [step, setStep] = useState<'details' | 'code'>(pendingEmail ? 'code' : 'details');
  const [target, setTarget] = useState(pendingEmail ?? '');
  const [password, setPassword] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const details = useForm<EmailChangeValues>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: { newEmail: '', currentPassword: '' },
  });
  const codeForm = useForm<EmailCodeValues>({
    resolver: zodResolver(emailCodeSchema),
    defaultValues: { code: '' },
  });

  // The Resend countdown, from the last answer's resendAfter
  useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);

  const start = async (values: EmailChangeValues) => {
    setFormError(null);
    setNotice(null);
    setBusy(true);
    try {
      const pending = await startEmailChange({ newEmail: values.newEmail.trim().toLowerCase(), currentPassword: values.currentPassword });
      setTarget(pending.pendingEmail);
      setPassword(values.currentPassword);
      setWait(pending.resendAfter);
      setStep('code');
      codeForm.reset({ code: '' });
      onPendingChange(pending.pendingEmail);
    } catch (err) {
      const failure = emailChangeFailure(err);
      if (failure.kind === 'field' && failure.field !== 'code') {
        details.setError(failure.field, { message: failure.message }, { shouldFocus: true });
      } else {
        setFormError(failure.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const verify = async ({ code }: EmailCodeValues) => {
    if (busy) return;
    setFormError(null);
    setNotice(null);
    setBusy(true);
    try {
      const user = await verifyEmailChange(code);
      onPendingChange(null);
      onChanged(user);
      onOpenChange(false);
    } catch (err) {
      const failure = emailChangeFailure(err);
      if (failure.kind === 'expired') {
        // The change is gone (expired, 5 wrong tries, or cancelled elsewhere): start again
        onPendingChange(null);
        setStep('details');
        details.reset({ newEmail: target, currentPassword: '' });
        setFormError(failure.message);
      } else if (failure.kind === 'field' && failure.field === 'newEmail') {
        // Taken by someone else meanwhile: the server retired the change
        onPendingChange(null);
        setStep('details');
        details.reset({ newEmail: target, currentPassword: '' });
        details.setError('newEmail', { message: failure.message }, { shouldFocus: true });
      } else if (failure.kind === 'field') {
        codeForm.reset({ code: '' });
        codeForm.setError('code', { message: failure.message }, { shouldFocus: true });
      } else {
        setFormError(failure.message);
      }
    } finally {
      setBusy(false);
    }
  };

  // AC-19: resending is the same start call with the pending address
  const resend = async () => {
    if (busy || wait > 0) return;
    if (!password) {
      // Opened from Enter code: the password isn't known here, so ask for it again
      setStep('details');
      details.reset({ newEmail: target, currentPassword: '' });
      setNotice('Enter your password to get a new code.');
      return;
    }
    setFormError(null);
    setBusy(true);
    try {
      const pending = await startEmailChange({ newEmail: target, currentPassword: password });
      setWait(pending.resendAfter);
      codeForm.reset({ code: '' });
      setNotice('We sent a new code. The old one no longer works.');
    } catch (err) {
      setFormError(emailChangeFailure(err).message);
    } finally {
      setBusy(false);
    }
  };

  const cancelChange = async () => {
    setBusy(true);
    try {
      await cancelEmailChange();
      onPendingChange(null);
      onOpenChange(false);
    } catch (err) {
      setFormError(emailChangeFailure(err).message);
    } finally {
      setBusy(false);
    }
  };

  const onCodeStep = step === 'code';

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => !busy && onOpenChange(next)}
      title={onCodeStep ? 'Confirm your new email' : 'Change email'}
      description={
        onCodeStep
          ? `We sent a 6 digit code to ${target}. It works for 10 minutes. Your email stays ${currentEmail} until you enter it.`
          : `You sign in with ${currentEmail} today. We’ll send a code to the new address, and tell this one.`
      }
      footer={
        onCodeStep ? (
          <>
            <Button type="button" variant="outline" size="touch" className="md:h-10 md:text-body" disabled={busy} onClick={() => void cancelChange()}>
              Cancel change
            </Button>
            <Button type="submit" form={formId} size="touch" className="md:h-10 md:text-body" loading={busy}>
              {busy ? 'Checking' : 'Confirm email'}
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="outline" size="touch" className="md:h-10 md:text-body" disabled={busy} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" form={formId} size="touch" className="md:h-10 md:text-body" loading={busy}>
              {busy ? 'Sending code' : 'Send code'}
            </Button>
          </>
        )
      }
    >
      {onCodeStep ? (
        <form id={formId} noValidate onSubmit={codeForm.handleSubmit(verify)} className="flex flex-col gap-5">
          {notice && <p className="text-body text-muted-foreground" role="status">{notice}</p>}
          <FormField
            control={codeForm.control}
            name="code"
            label="Code"
            required
            render={({ field, controlProps }) => (
              <InputOTP
                {...controlProps}
                ref={field.ref}
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                onComplete={() => void codeForm.handleSubmit(verify)()}
                maxLength={CODE_LENGTH}
                pattern={REGEXP_ONLY_DIGITS}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                disabled={busy}
              >
                <InputOTPGroup>
                  {Array.from({ length: CODE_LENGTH }, (_, i) => (
                    <InputOTPSlot key={i} index={i} className="size-11 text-base-input md:size-10" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            )}
          />
          <div>
            <Button type="button" variant="link" className="h-11 px-0 tabular-nums" disabled={busy || wait > 0} onClick={() => void resend()}>
              {wait > 0 ? `Resend code in ${wait} s` : 'Resend code'}
            </Button>
          </div>
          {formError && <FormAlert message={formError} />}
        </form>
      ) : (
        <form id={formId} noValidate onSubmit={details.handleSubmit(start)} className="flex flex-col gap-5">
          {notice && <p className="text-body text-muted-foreground" role="status">{notice}</p>}
          <FieldGroup className="gap-5">
            <FormField
              control={details.control}
              name="newEmail"
              label="New email address"
              required
              render={({ field, controlProps }) => (
                <Input {...field} {...controlProps} type="email" autoComplete="email" spellCheck={false} autoFocus />
              )}
            />
            <FormField
              control={details.control}
              name="currentPassword"
              label="Current password"
              required
              description="So a borrowed or stolen session can’t take your account."
              render={({ field, controlProps }) => <PasswordInput {...field} {...controlProps} autoComplete="current-password" />}
            />
          </FieldGroup>
          {formError && <FormAlert message={formError} />}
        </form>
      )}
    </ResponsiveDialog>
  );
}
