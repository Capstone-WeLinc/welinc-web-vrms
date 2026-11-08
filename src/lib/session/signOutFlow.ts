import { confirm } from '../../components/shared/confirm/confirm';
import { signOut } from './session';

/**
 * Sign out as every button does it (spec 0003, AC-24): an optional "Sign out?" check, then the
 * server logout. If it fails, say so and offer to try again rather than leaving quietly, since
 * the session may still be open in other systems.
 */
export async function signOutFlow({ ask }: { ask: boolean }): Promise<void> {
  if (ask) {
    const confirmed = await confirm({
      title: 'Sign out?',
      description: 'You will be signed out of every WeLinc system on this device.',
      confirmText: 'Sign out',
    });
    if (!confirmed) return;
  }
  while ((await signOut()) === 'failed') {
    const retry = await confirm({
      title: "Couldn't sign out",
      description:
        "VRMS couldn't reach the sign in service, so your session may still be open. Check your connection and try again.",
      confirmText: 'Try again',
      cancelText: 'Stay here',
      tone: 'warning',
    });
    if (!retry) return;
  }
}
