import { useId, useRef, useState, type FormEvent, type RefObject } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { confirm } from '../../../components/shared/confirm/confirm';
import { FormAlert } from '../../../components/shared/FormAlert';
import { ResponsiveDialog } from '../../../components/shared/ResponsiveDialog';
import { useToast } from '../../../context/toast';
import { createUser, updateUser } from '../../../lib/api/authApi';
import { getApiErrorMessage, getApiErrorStatus } from '../../../lib/api/errors';
import type { ManagedUser, UpdateUserPayload, UserRole } from '../../../types';
import { hasUneditableRoles, vrmsRoles } from '../lib/accountStatus';
import { userFormSchema, type UserFormOutput, type UserFormValues } from '../lib/userFormSchema';

export type SaveOutcome = 'created' | 'updated' | 'created-mail-failed';

interface UserFormDialogProps {
  open: boolean;
  /** Called with false to close; the dialog asks first when the form is dirty. */
  onOpenChange: (open: boolean) => void;
  /** null for New user; otherwise a snapshot of the row taken when the dialog opened (AC-11). */
  user: ManagedUser | null;
  currentUserId: string | undefined;
  finalFocusRef: RefObject<HTMLElement | null>;
  /** Pauses background refetches while the request runs (AC-8). */
  runWrite: <T>(write: () => Promise<T>) => Promise<T>;
  /** Refetches the list; resolves null when it failed. */
  refetch: () => Promise<ManagedUser[] | null>;
  /** The server's copy after a save. The page updates the list, toasts and closes the dialog. */
  onSaved: (user: ManagedUser, outcome: SaveOutcome) => void;
}

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'CHIEF_MECHANIC', label: 'Chief mechanic' },
  { value: 'MECHANIC', label: 'Mechanic' },
] as const;

/** A 5xx or no response at all: welinc-auth may have saved the user before its mail failed (AC-10). */
function mayHaveSaved(err: unknown) {
  const status = getApiErrorStatus(err);
  return status === undefined || status >= 500;
}

/** New user and Edit user, in one react-hook-form dialog (spec 0006, AC-10 to AC-14, AC-22). */
export function UserFormDialog({
  open,
  onOpenChange,
  user,
  currentUserId,
  finalFocusRef,
  runWrite,
  refetch,
  onSaved,
}: UserFormDialogProps) {
  const formId = useId();
  const { showToast } = useToast();
  const savedRole = user ? (vrmsRoles(user)[0] ?? '') : 'MECHANIC';
  const isSelf = !!user && user.id === currentUserId;
  const roleLockReason = isSelf
    ? 'You can’t change your own role.'
    : user && hasUneditableRoles(user)
      ? 'This user has a role this page can’t edit yet.'
      : null;

  const {
    control,
    handleSubmit,
    setError,
    formState: { isDirty },
  } = useForm<UserFormValues, unknown, UserFormOutput>({
    resolver: zodResolver(userFormSchema),
    mode: 'onTouched',
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '', role: savedRole },
  });

  // Set on the first Save press, before validation, and held through the email prompt and the
  // request, so a second press or Enter never queues a second prompt or request (AC-13).
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const finish = () => {
    submittingRef.current = false;
    setSubmitting(false);
    setSaving(false);
  };

  const showSaveError = (err: unknown) => {
    const status = getApiErrorStatus(err);
    const message = getApiErrorMessage(err, '');
    if (status === 409) {
      setError('email', { message: 'An account with this email already exists.' }, { shouldFocus: true });
    } else if (status === 400 && /email domain/i.test(message)) {
      setError('email', { message }, { shouldFocus: true });
    } else {
      const text = message ? `Couldn’t save: ${message}` : 'Couldn’t save. Check your connection and try again.';
      setFormError(text);
      showToast(text, 'error');
    }
  };

  const save = async ({ name, email: typedEmail, role }: UserFormOutput) => {
    const email = typedEmail.toLowerCase();

    if (user && !isDirty) {
      finish();
      onOpenChange(false);
      return;
    }

    const savedEmail = user?.email.trim().toLowerCase();
    if (user && email !== savedEmail) {
      const ok = await confirm({
        title: 'Change their sign in email?',
        description: `${name} will sign in with ${email} from now on. ${user.email} will stop working.${
          isSelf ? ' Use the new address the next time you sign in.' : ''
        }`,
        confirmText: 'Change email',
        cancelText: 'Keep editing',
      });
      if (!ok) {
        finish();
        return;
      }
    }

    setFormError(null);
    setSaving(true);
    const roleAssignments = [{ role: role as UserRole, system: 'VRMS' as const }];
    try {
      if (user) {
        const payload: UpdateUserPayload = { name };
        if (email !== savedEmail) payload.email = email;
        if (!roleLockReason && role !== savedRole) payload.roleAssignments = roleAssignments;
        const saved = await runWrite(() => updateUser(user.id, payload));
        finish();
        onSaved(saved, 'updated');
      } else {
        // No password and no isActive, so welinc-auth emails the setup code.
        const saved = await runWrite(() => createUser({ name, email, roleAssignments }));
        finish();
        onSaved(saved, 'created');
      }
    } catch (err) {
      if (!user && mayHaveSaved(err)) {
        const created = (await refetch())?.find((item) => item.email.toLowerCase() === email);
        if (created) {
          finish();
          onSaved(created, 'created-mail-failed');
          return;
        }
      }
      finish();
      showSaveError(err);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    void handleSubmit(save, finish)(event);
  };

  const changeOpen = async (next: boolean) => {
    if (next || submittingRef.current) return;
    if (isDirty) {
      const discard = await confirm({
        title: 'Discard changes?',
        description: 'What you entered will be lost.',
        confirmText: 'Discard',
        cancelText: 'Keep editing',
        tone: 'destructive',
      });
      if (!discard) return;
    }
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => void changeOpen(next)}
      title={user ? `Edit ${user.name}` : 'New user'}
      description={user ? undefined : 'They’ll get an email with a code to set their password.'}
      finalFocusRef={finalFocusRef}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="touch"
            className="md:h-10 md:text-sm"
            disabled={submitting}
            onClick={() => void changeOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} size="touch" className="md:h-10 md:text-sm" disabled={submitting} loading={saving}>
            {user ? 'Save changes' : 'Create user'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        <FormField
          control={control}
          name="name"
          label="Name"
          required
          render={({ field, controlProps }) => <Input {...field} {...controlProps} autoComplete="off" />}
        />
        <FormField
          control={control}
          name="email"
          label="Email"
          required
          description="This is their sign in."
          render={({ field, controlProps }) => (
            <Input {...field} {...controlProps} type="email" autoComplete="off" spellCheck={false} />
          )}
        />
        <FormField
          control={control}
          name="role"
          label="Role"
          required
          description={roleLockReason ?? undefined}
          render={({ field, controlProps, labelId }) => (
            <ToggleGroup
              type="single"
              variant="outline"
              size="touch"
              id={controlProps.id}
              aria-labelledby={labelId}
              aria-describedby={controlProps['aria-describedby']}
              disabled={!!roleLockReason}
              value={field.value}
              // Radix sends '' when the selected item is pressed again; the role is never empty.
              onValueChange={(value) => value && field.onChange(value)}
              className="grid w-full grid-cols-2 sm:flex sm:w-fit"
            >
              {ROLE_OPTIONS.map((option) => (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  ref={option.value === field.value ? field.ref : undefined}
                  onBlur={field.onBlur}
                  className="md:h-10 md:text-sm"
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        />
        {formError && <FormAlert message={formError} />}
      </form>
    </ResponsiveDialog>
  );
}
