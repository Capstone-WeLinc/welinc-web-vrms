import { toast } from 'sonner';
import { confirm, confirmChoice } from '../../../components/shared/confirm/confirm';
import type { ToastType } from '../../../context/toast';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { getOpenWork, releaseTickets, type OpenWork } from '../../../lib/api/vrmsConfigApi';
import type { ManagedUser } from '../../../types';
import { onMechanicRoster } from './accountStatus';
import { openWorkSummary, RELEASE_CHOICES, ticketCount } from './openWorkCopy';

// Spec 0011, AC-35: what happens to a person's open tickets when they leave VRMS. It never blocks:
// the Admin picks "Move them back to the queue" (default) or "Keep them assigned".

export type Release = 'RELEASE' | 'KEEP' | 'STOP';

async function readOpenWork(user: ManagedUser): Promise<OpenWork | null | 'stop'> {
  try {
    return await getOpenWork(user.id);
  } catch {
    // Fails closed for a mechanic; an account that was never a mechanic has no tickets to strand.
    if (!onMechanicRoster(user)) return null;
    const again = await confirm({
      title: 'Couldn’t check open work',
      description: `We couldn’t check whether ${user.name} has open repair tickets, so we can’t go on yet.`,
      confirmText: 'Try again',
      cancelText: 'Close',
    });
    return again ? readOpenWork(user) : 'stop';
  }
}

interface AskOptions {
  title: string;
  /** The sentence before the open work counts, such as "They’ll be signed out." */
  description: string;
  confirmText: string;
  tone?: 'default' | 'destructive';
  /** Ask even when they hold no open tickets (deactivate); a role change just saves. */
  alwaysConfirm: boolean;
}

/** Checks open work, then asks. 'STOP' means the Admin backed out. */
export async function askAboutOpenWork(user: ManagedUser, options: AskOptions): Promise<Release> {
  const work = await readOpenWork(user);
  if (work === 'stop') return 'STOP';
  const { title, confirmText, tone } = options;

  if (work && work.total > 0) {
    const choice = await confirmChoice({
      title,
      description: `${options.description} ${user.name} has ${ticketCount(work.total)} (${openWorkSummary(work.byStatus)}). What should happen to them?`,
      confirmText,
      tone,
      choices: RELEASE_CHOICES,
    });
    if (!choice) return 'STOP';
    return choice === 'KEEP' ? 'KEEP' : 'RELEASE';
  }

  if (!options.alwaysConfirm) return 'KEEP';
  const ok = await confirm({ title, description: options.description, confirmText, tone });
  return ok ? 'KEEP' : 'STOP';
}

/** Moves their tickets back to the queue once welinc-auth has the change; a failure offers Retry. */
export async function releaseAfterLeaving(
  user: ManagedUser,
  reason: 'DEACTIVATED' | 'ROLE_REMOVED',
  showToast: (message: string, type?: ToastType) => void,
  done: string,
): Promise<void> {
  try {
    const result = await releaseTickets(user.id, reason);
    const moved = result.released === 0 ? '' : ` ${ticketCount(result.released).replace('open ', '')} taken off them.`;
    showToast(`${done}${moved}`);
  } catch (err) {
    toast.error(`${done} But their tickets couldn’t be moved: ${getApiErrorMessage(err, 'check your connection')}`.replace(/\.$/, '.'), {
      action: { label: 'Retry', onClick: () => void releaseAfterLeaving(user, reason, showToast, done) },
    });
  }
}
