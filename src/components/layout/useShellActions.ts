import { useAuthStore } from '../../store/authStore';
import { signOutFlow } from '../../lib/session/signOutFlow';
import { canSwitchSystem, switchSystemUrl } from '../../lib/session/switchSystem';

/** Sign out and Switch system, shared by the sidebar, the phone sheet and the user menu. */
export function useShellActions() {
  const user = useAuthStore((state) => state.user);
  const showSwitchSystem = canSwitchSystem(user);

  // Same tab, to the portal launcher; no token in a URL (spec 0007, AC-9)
  const switchSystem = () => {
    window.location.assign(switchSystemUrl());
  };

  const signOut = () => signOutFlow({ ask: true });

  return { canSwitchSystem: showSwitchSystem, switchSystem, signOut };
}
