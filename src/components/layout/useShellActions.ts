import { useAuthStore } from '../../store/authStore';
import { confirm } from '../shared/confirm/confirm';

const PORTAL_URL = import.meta.env.VITE_PORTAL_URL || 'http://localhost:8000';
const VMMS_URL = import.meta.env.VITE_VMMS_URL || 'http://localhost:8002';
const SUBSYSTEMS = ['VRMS', 'VMMS', 'BMS'];

/** Sign out and subsystem switching, shared by the sidebar, the phone sheet and the user menu. */
export function useShellActions() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const systems = new Set(
    (user?.roles ?? [])
      .map((assignment) => assignment.system?.toUpperCase())
      .filter((system) => system && SUBSYSTEMS.includes(system)),
  );
  const canSwitchToVmms = systems.size > 1;

  const switchToVmms = () => {
    const token = useAuthStore.getState().token || localStorage.getItem('welinc_token');
    window.location.href = token ? `${VMMS_URL}/login?token=${token}` : VMMS_URL;
  };

  const signOut = async () => {
    const confirmed = await confirm({
      title: 'Sign out?',
      description: 'Are you sure you want to sign out of WeLinc VRMS?',
      confirmText: 'Sign out',
    });
    if (!confirmed) return;
    logout();
    window.location.href = `${PORTAL_URL}/login?logout=true`;
  };

  return { canSwitchToVmms, switchToVmms, signOut };
}
