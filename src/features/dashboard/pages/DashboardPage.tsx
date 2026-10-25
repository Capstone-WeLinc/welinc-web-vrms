import { isMechanicRole } from '../../../lib/roles';
import { useAuthStore } from '../../../store/authStore';
import { AdminDashboard } from '../components/AdminDashboard';
import { MechanicDashboard } from '../components/MechanicDashboard';

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  return isMechanicRole(user?.role) ? <MechanicDashboard /> : <AdminDashboard />;
}
