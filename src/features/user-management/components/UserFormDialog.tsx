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
import { createUser, updateUser, type LookupAccount } from '../../../lib/api/authApi';
import { getAccountExists, getApiErrorMessage, getApiErrorStatus } from '../../../lib/api/errors';
import type { ManagedUser, UpdateUserPayload, UserRole } from '../../../types';
import { hasUneditableRoles, onMechanicRoster, vrmsRoles } from '../lib/accountStatus';
import { askAboutOpenWork, releaseAfterLeaving } from '../lib/openWorkFlow';
import { systemsText } from '../lib/openWorkCopy';
import { ExistingAccountPicker } from './ExistingAccountPicker';
import { MechanicOpenTickets } from './MechanicOpenTickets';
import { userFormSchema, type UserFormOutput, type UserFormValues } from '../lib/userFormSchema';

export type SaveOutcome = 'created' | 'updated' | 'created-mail-failed' | 'attached';

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
  /** A mechanic's tickets changed from the Open tickets section (feature 57). */
  onWorkChanged: () => void;
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

/** The message welinc-auth sends when another system's admin owns the account (spec 0011, AC-28). */
const ADMIN_ELSEWHERE = /is an admin in/i;

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
  onWorkChanged,
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
    getValues,
    setError,
    resetField,
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
  // New user has two paths (spec 0011, AC-36); the existing path picks an account instead of typing one.
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [picked, setPicked] = useState<LookupAccount | null>(null);
  // Set once welinc-auth says the email is not ours to change (spec 0011, AC-28).
  const [emailLocked, setEmailLocked] = useState(false);
  const otherSystems = user?.otherSystems ?? [];

  const finish = () => {
    submittingRef.current = false;
    setSubmitting(false);
    setSaving(false);
  };

  const showSaveError = (err: unknown) => {
    const status = getApiErrorStatus(err);
    const message = getApiErrorMessage(err, '');
    if (status === 403 && ADMIN_ELSEWHERE.test(message)) {
      resetField('email');
      setEmailLocked(true);
      setFormError(message);
      showToast(message, 'error');
    } else if (status === 409) {
      setError('email', { message: 'An account with this email already exists.' }, { shouldFocus: true });
    } else if (status === 400 && /email domain/i.test(message)) {
      setError('email', { message }, { shouldFocus: true });
    } else {
      const text = message ? `Couldn’t save: ${message}` : 'Couldn’t save. Check your connection and try again.';
      setFormError(text);
      showToast(text, 'error');
    }
  };

  const roleLabel = (role: string) => ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;

  /** Adds the VRMS role to an account that already exists; their password and name stay as they are. */
  const attach = async (name: string, email: string, role: string) => {
    setFormError(null);
    setSaving(true);
    try {
      const saved = await runWrite(() =>
        createUser({ name, email, roleAssignments: [{ role: role as UserRole, system: 'VRMS' }], attachExisting: true }),
      );
      finish();
      onSaved(saved, 'attached');
    } catch (err) {
      finish();
      showSaveError(err);
    }
  };

  const saveExisting = async () => {
    if (!picked) {
      setFormError('Pick an account to add.');
      finish();
      return;
    }
    await attach(picked.name, picked.email, getValues('role'));
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
        }${otherSystems.length ? ` This changes their sign in for ${systemsText(otherSystems)} too.` : ''}`,
        confirmText: 'Change email',
        cancelText: 'Keep editing',
      });
      if (!ok) {
        finish();
        return;
      }
    }

    // Leaving the mechanic roles for another one ends their hold on tickets, so ask about them first
    const leavingMechanic =
      !!user && !roleLockReason && onMechanicRoster(user) && role !== savedRole && role !== 'MECHANIC' && role !== 'CHIEF_MECHANIC';
    let release: 'RELEASE' | 'KEEP' | 'STOP' = 'KEEP';
    if (user && leavingMechanic) {
      release = await askAboutOpenWork(user, {
        title: `Change ${name}’s role?`,
        description: 'They’ll lose their mechanic role.',
        confirmText: 'Change role',
        alwaysConfirm: false,
      });
      if (release === 'STOP') {
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
        if (release === 'RELEASE') void releaseAfterLeaving(user, 'ROLE_REMOVED', showToast, 'Role changed.');
      } else {
        // No password and no isActive, so welinc-auth emails the setup code.
        const saved = await runWrite(() => createUser({ name, email, roleAssignments }));
        finish();
        onSaved(saved, 'created');
      }
    } catch (err) {
      const exists = !user ? getAccountExists(err) : null;
      if (exists) {
        finish();
        const names = systemsText(exists.systems);
        const ok = await confirm({
          title: 'Add them to VRMS?',
          description: `This email already has a WeLinc account${names ? ` (in ${names})` : ''}. Add the ${roleLabel(role)} role in VRMS to it? They keep their current password.`,
          confirmText: 'Add to VRMS',
          cancelText: 'Cancel',
        });
        if (ok) {
          submittingRef.current = true;
          setSubmitting(true);
          await attach(exists.name, email, role);
        }
        return;
      }
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
    if (!user && mode === 'existing') void saveExisting();
    else void handleSubmit(save, finish)(event);
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
      description={
        user
          ? otherSystems.length
            ? `This account is also used in ${systemsText(otherSystems)}. A new email changes their sign in for every system.`
            : undefined
          : mode === 'new'
            ? 'They’ll get an email with a code to set their password.'
            : 'They keep their current password and sign in the way they do now.'
      }
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
            {user ? 'Save changes' : mode === 'new' ? 'Create user' : 'Add to VRMS'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        {!user && (
          <ToggleGroup
            type="single"
            variant="outline"
            size="touch"
            aria-label="Account type"
            value={mode}
            onValueChange={(value) => {
              if (value !== 'new' && value !== 'existing') return;
              setMode(value);
              setFormError(null);
            }}
            className="grid w-full grid-cols-2"
          >
            <ToggleGroupItem value="new" className="md:h-10 md:text-sm">
              New account
            </ToggleGroupItem>
            <ToggleGroupItem value="existing" className="md:h-10 md:text-sm">
              Existing WeLinc account
            </ToggleGroupItem>
          </ToggleGroup>
        )}
        {mode === 'existing' && !user ? (
          <ExistingAccountPicker selected={picked} onSelect={setPicked} />
        ) : (
          <>
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
              description={emailLocked ? 'This account is an admin in another system. Send a reset code instead.' : 'This is their sign in.'}
              render={({ field, controlProps }) => (
                <Input {...field} {...controlProps} type="email" autoComplete="off" spellCheck={false} readOnly={emailLocked} />
              )}
            />
          </>
        )}
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
      {user && onMechanicRoster(user) && <MechanicOpenTickets user={user} onChanged={onWorkChanged} />}
    </ResponsiveDialog>
  );
}
