import { useAuthStore } from '../../store/authStore';
import { signOutFlow } from '../../lib/session/signOutFlow';
import { canSwitchSystem } from '../../lib/session/switchSystem';

/** Sign out and whether the system switcher opens a menu, shared by the top bar's switcher and avatar menu. */
export function useShellActions() {
  const user = useAuthStore((state) => state.user);
  const signOut = () => signOutFlow({ ask: true });
  return { canSwitchSystem: canSwitchSystem(user), signOut };
}
