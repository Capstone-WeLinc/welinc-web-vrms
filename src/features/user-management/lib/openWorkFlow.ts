import { confirm } from '../../../components/shared/confirm/confirm';
import { getOpenWork, type OpenWork } from '../../../lib/api/vrmsConfigApi';
import type { ManagedUser } from '../../../types';
import { onMechanicRoster } from './accountStatus';
import { openWorkSummary, ticketCount } from './openWorkCopy';

// Spec 0011, AC-35: what happens to a person's open tickets when they leave VRMS. It never blocks.

/** 'GO' saves the change; 'STOP' means the Admin backed out. */
export type Release = 'GO' | 'STOP';

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

/**
 * Checks open work, then asks once. Suite spec 0012, AC-24: VRMS takes the tickets off a person
 * who leaves on its own (within about 30 seconds), so there is no choice to make, only what will
 * happen to say.
 */
export async function askAboutOpenWork(user: ManagedUser, options: AskOptions): Promise<Release> {
  const work = await readOpenWork(user);
  if (work === 'stop') return 'STOP';
  const { title, confirmText, tone } = options;

  if (work && work.total > 0) {
    const ok = await confirm({
      title,
      description: `${options.description} ${user.name} has ${ticketCount(work.total)} (${openWorkSummary(work.byStatus)}). They go back to the queue for the Chief Mechanic to assign again.`,
      confirmText,
      tone,
    });
    return ok ? 'GO' : 'STOP';
  }

  if (!options.alwaysConfirm) return 'GO';
  const ok = await confirm({ title, description: options.description, confirmText, tone });
  return ok ? 'GO' : 'STOP';
}
