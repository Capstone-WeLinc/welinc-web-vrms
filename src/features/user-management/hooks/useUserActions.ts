import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { confirm } from '../../../components/shared/confirm/confirm';
import type { RowAction } from '../../../components/shared/data-table/types';
import { useToast } from '../../../context/toast';
import { requestPasswordReset, setUserStatus, unlockUser } from '../../../lib/api/authApi';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { getAvailableMechanics, type MechanicOption } from '../../../lib/api/vrmsConfigApi';
import type { ManagedUser } from '../../../types';
import { getAccountStatus, vrmsRoles } from '../lib/accountStatus';
import { returnFocusToRow } from '../lib/focusReturn';
import { findMechanicWithOpenWork } from '../lib/openWork';

interface UserActionsOptions {
  currentUserId: string | undefined;
  onEdit: (user: ManagedUser) => void;
  runWrite: <T>(write: () => Promise<T>) => Promise<T>;
  upsertUser: (user: ManagedUser) => void;
}

/** The server's message for a toast, without its own closing period. */
function reason(err: unknown) {
  return getApiErrorMessage(err, 'check your connection and try again').replace(/\.$/, '');
}

/** Each row's actions menu and the confirm, call and toast behind every item (spec 0006, AC-9, AC-15 to AC-21). */
export function useUserActions({ currentUserId, onEdit, runWrite, upsertUser }: UserActionsOptions) {
  const navigate = useNavigate();
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
      const ok = await confirm({
        title: setup ? `Resend ${user.name}’s setup code?` : `Send ${user.name} a reset code?`,
        description: setup
          ? `We’ll email a new code to ${user.email}. It works for 10 minutes.`
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
        user.emailVerified
          ? 'They can sign in again with their current password.'
          : 'They still need to set a password. Send them a setup code after reactivating.',
      ];
      if (user.isLocked) parts.push('They’re still locked. Unlock them next.');
      const ok = await confirm({ title: `Reactivate ${user.name}?`, description: parts.join(' '), confirmText: 'Reactivate' });
      if (!ok) return;
      try {
        upsertUser(await setUserStatus(user.id, true));
        showToast(`${user.name} reactivated.`);
      } catch (err) {
        showToast(`Couldn’t reactivate ${user.name}: ${reason(err)}.`, 'error');
      }
    });

  /**
   * AC-16: a fresh mechanics list, never a cached one. 'clear' continues to the deactivate
   * prompt; 'stop' ends the action (blocked, opened their tickets, or closed).
   */
  const checkOpenWork = async (user: ManagedUser): Promise<'clear' | 'stop'> => {
    let mechanics: MechanicOption[];
    try {
      mechanics = await getAvailableMechanics();
    } catch {
      // Fails closed for a mechanic; an admin only account has no tickets to strand.
      if (!vrmsRoles(user).includes('MECHANIC')) return 'clear';
      const again = await confirm({
        title: 'Couldn’t check open work',
        description: `We couldn’t check whether ${user.name} has open repair tickets, so they can’t be deactivated yet.`,
        confirmText: 'Try again',
        cancelText: 'Close',
      });
      return again ? checkOpenWork(user) : 'stop';
    }

    const mechanic = findMechanicWithOpenWork(user, mechanics);
    if (!mechanic) return 'clear';
    const open = await confirm({
      title: `Reassign ${user.name}’s work first`,
      description: `${user.name} still has open repair tickets. Reassign or close them, then deactivate.`,
      confirmText: 'Open their tickets',
      cancelText: 'Close',
    });
    if (open) navigate(`/repairs?mechanic=${mechanic.id}`);
    return 'stop';
  };

  const deactivate = (user: ManagedUser) =>
    run(user, async () => {
      if ((await checkOpenWork(user)) === 'stop') return;
      const ok = await confirm({
        title: `Deactivate ${user.name}?`,
        description: 'They’ll be signed out and can’t sign in until you reactivate them. Their tickets and history stay.',
        confirmText: 'Deactivate',
        tone: 'destructive',
      });
      if (!ok) return;
      try {
        upsertUser(await setUserStatus(user.id, false));
        showToast(`${user.name} deactivated.`);
      } catch (err) {
        showToast(`Couldn’t deactivate ${user.name}: ${reason(err)}.`, 'error');
      }
    });

  const rowActions = (user: ManagedUser): RowAction[] => {
    const status = getAccountStatus(user);
    const actions: RowAction[] = [{ label: 'Edit', onSelect: () => onEdit(user) }];
    if (status === 'ACTIVE') actions.push({ label: 'Send reset code', onSelect: () => sendCode(user, 'reset') });
    if (status === 'SETUP_PENDING') actions.push({ label: 'Resend setup code', onSelect: () => sendCode(user, 'setup') });
    if (status === 'LOCKED') {
      actions.push({ label: 'Unlock and send reset code', onSelect: () => unlockAndSend(user) });
      actions.push({ label: 'Unlock', onSelect: () => unlock(user) });
    }
    if (status === 'INACTIVE') actions.push({ label: 'Reactivate', onSelect: () => reactivate(user) });
    else if (user.id !== currentUserId) actions.push({ label: 'Deactivate', onSelect: () => deactivate(user), destructive: true });
    return actions;
  };

  return { rowActions };
}
