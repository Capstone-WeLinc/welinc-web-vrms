import { useRef } from 'react';
import { confirm } from '../../../components/shared/confirm/confirm';
import type { RowAction } from '../../../components/shared/data-table/types';
import { useToast } from '../../../context/toast';
import { requestPasswordReset, setUserStatus, unlockUser } from '../../../lib/api/authApi';
import { getApiErrorMessage } from '../../../lib/api/errors';
import type { ManagedUser } from '../../../types';
import { getAccountStatus } from '../lib/accountStatus';
import { returnFocusToRow } from '../lib/focusReturn';
import { askAboutOpenWork, releaseAfterLeaving } from '../lib/openWorkFlow';
import { sharedBlockNote } from '../lib/openWorkCopy';
import { refreshAfterSave } from '../lib/mechanicRefresh';

interface UserActionsOptions {
  currentUserId: string | undefined;
  onEdit: (user: ManagedUser) => void;
  /** Opens the user's sessions dialog (spec 0003, AC-35). */
  onSessions: (user: ManagedUser) => void;
  runWrite: <T>(write: () => Promise<T>) => Promise<T>;
  upsertUser: (user: ManagedUser) => void;
}

/** The server's message for a toast, without its own closing period. */
function reason(err: unknown) {
  return getApiErrorMessage(err, 'check your connection and try again').replace(/\.$/, '');
}

/** Each row's actions menu and the confirm, call and toast behind every item (spec 0006, AC-9, AC-15 to AC-21, spec 0011, AC-35). */
export function useUserActions({ currentUserId, onEdit, onSessions, runWrite, upsertUser }: UserActionsOptions) {
  const { showToast } = useToast();
  // Rows with an action between its confirm and its last response; their other actions do nothing.
  const busy = useRef(new Set<string>());

  const run = (user: ManagedUser, flow: () => Promise<void>) => {
    if (busy.current.has(user.id)) return;
    busy.current.add(user.id);
    void runWrite(flow).finally(() => {
      busy.current.delete(user.id);
      returnFocusToRow(user.id);
    });
  };

  const sendCode = (user: ManagedUser, kind: 'reset' | 'setup') =>
    run(user, async () => {
      const setup = kind === 'setup';
      // Suite spec 0009, AC-29: a reset also confirms an unconfirmed email
      const unverified = !setup && !user.emailVerified;
      const ok = await confirm({
        title: setup ? `Resend ${user.name}’s setup code?` : `Send ${user.name} a reset code?`,
        description: setup
          ? `We’ll email a new code to ${user.email}. It works for 1 hour.`
          : unverified
            ? `We’ll email a code to ${user.email}. Using it sets a new password and confirms their email. They'll also get a code when they next sign in.`
            : `We’ll email a code to ${user.email}. It works for 10 minutes and lets them choose a new password from the sign in page. Their current password keeps working until then.`,
        confirmText: 'Send code',
      });
      if (!ok) return;
      try {
        await requestPasswordReset(user.email);
        showToast(setup ? `Setup code sent to ${user.email}.` : `Reset code sent to ${user.email}.`);
      } catch (err) {
        showToast(`Couldn’t send the ${kind} code: ${reason(err)}.`, 'error');
      }
    });

  const unlockAndSend = (user: ManagedUser) =>
    run(user, async () => {
      const ok = await confirm({
        title: `Unlock ${user.name} and send a reset code?`,
        description: `Their account locked after 5 failed sign ins. This unlocks it and emails a code to ${user.email} so they can choose a new password.`,
        confirmText: 'Unlock and send',
      });
      if (!ok) return;
      try {
        upsertUser(await unlockUser(user.id));
      } catch (err) {
        showToast(`Couldn’t unlock ${user.name}: ${reason(err)}.`, 'error');
        return;
      }
      try {
        await requestPasswordReset(user.email);
        showToast(`${user.name} unlocked. A reset code was sent to ${user.email}.`);
      } catch (err) {
        showToast(`${user.name} is unlocked, but the reset code couldn’t be sent: ${reason(err)}.`, 'error');
      }
    });

  const unlock = (user: ManagedUser) =>
    run(user, async () => {
      const ok = await confirm({
        title: `Unlock ${user.name}?`,
        description: 'They can sign in again with their current password.',
        confirmText: 'Unlock',
      });
      if (!ok) return;
      try {
        upsertUser(await unlockUser(user.id));
        showToast(`${user.name} unlocked.`);
      } catch (err) {
        showToast(`Couldn’t unlock ${user.name}: ${reason(err)}.`, 'error');
      }
    });

  const reactivate = (user: ManagedUser) =>
    run(user, async () => {
      // From the raw fields, not the derived status, which reads Inactive for all of them.
      const parts = [
        user.passwordSet
          ? 'They can sign in again with their current password.'
          : 'They still need to set a password. Send them a setup code after reactivating.',
      ];
      if (user.isLocked) parts.push('They’re still locked. Unlock them next.');
      const ok = await confirm({ title: `Reactivate ${user.name}?`, description: parts.join(' '), confirmText: 'Reactivate' });
      if (!ok) return;
      try {
        upsertUser(await setUserStatus(user.id, true));
        showToast(`${user.name} reactivated.`);
        refreshAfterSave(user.id, showToast);
      } catch (err) {
        showToast(`Couldn’t reactivate ${user.name}: ${reason(err)}.`, 'error');
      }
    });

  const deactivate = (user: ManagedUser) =>
    run(user, async () => {
      const release = await askAboutOpenWork(user, {
        title: `Deactivate ${user.name}?`,
        description: `They’ll be signed out and can’t sign in until you reactivate them. Their history stays.${sharedBlockNote(user.otherSystems)}`,
        confirmText: 'Deactivate',
        tone: 'destructive',
        alwaysConfirm: true,
      });
      if (release === 'STOP') return;
      try {
        upsertUser(await setUserStatus(user.id, false));
        refreshAfterSave(user.id, showToast);
      } catch (err) {
        showToast(`Couldn’t deactivate ${user.name}: ${reason(err)}.`, 'error');
        return;
      }
      const done = `${user.name} deactivated.`;
      if (release === 'RELEASE') await releaseAfterLeaving(user, 'DEACTIVATED', showToast, done);
      else showToast(done);
    });

  const rowActions = (user: ManagedUser): RowAction[] => {
    const status = getAccountStatus(user);
    const actions: RowAction[] = [{ label: 'Edit', onSelect: () => onEdit(user) }];
    if (status === 'ACTIVE' || status === 'EMAIL_NOT_VERIFIED') {
      actions.push({ label: 'Send reset code', onSelect: () => sendCode(user, 'reset') });
    }
    if (status === 'SETUP_PENDING') actions.push({ label: 'Resend setup code', onSelect: () => sendCode(user, 'setup') });
    if (status === 'LOCKED') {
      actions.push({ label: 'Unlock and send reset code', onSelect: () => unlockAndSend(user) });
      actions.push({ label: 'Unlock', onSelect: () => unlock(user) });
    }
    // Not your own: you end your devices from your profile (spec 0003, AC-35)
    if (user.id !== currentUserId) actions.push({ label: 'Sessions', onSelect: () => onSessions(user) });
    if (status === 'INACTIVE') actions.push({ label: 'Reactivate', onSelect: () => reactivate(user) });
    else if (user.id !== currentUserId) actions.push({ label: 'Deactivate', onSelect: () => deactivate(user), destructive: true });
    return actions;
  };

  return { rowActions };
}
