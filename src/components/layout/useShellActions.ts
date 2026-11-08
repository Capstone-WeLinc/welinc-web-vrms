import { useAuthStore } from '../../store/authStore';
import { signOut as endSession } from '../../lib/session/session';
import { confirm } from '../shared/confirm/confirm';

const VMMS_URL = import.meta.env.VITE_VMMS_URL || 'http://localhost:8002';
const SUBSYSTEMS = ['VRMS', 'VMMS', 'BMS'];

/** Sign out and subsystem switching, shared by the sidebar, the phone sheet and the user menu. */
export function useShellActions() {
  const user = useAuthStore((state) => state.user);

  const systems = new Set(
    (user?.roles ?? [])
      .map((assignment) => assignment.system?.toUpperCase())
      .filter((system) => system && SUBSYSTEMS.includes(system)),
  );
  const canSwitchToVmms = systems.size > 1;

  // No token in a URL (spec 0001 section 13, rule 6). S4 replaces this with Switch system
  const switchToVmms = () => {
    window.location.href = VMMS_URL;
  };

  const signOut = async () => {
    const confirmed = await confirm({
      title: 'Sign out?',
      description: 'Are you sure you want to sign out of WeLinc VRMS?',
      confirmText: 'Sign out',
    });
    if (!confirmed) return;
    endSession();
  };

  return { canSwitchToVmms, switchToVmms, signOut };
}
