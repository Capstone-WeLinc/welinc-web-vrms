import { useAuthStore } from '../../../store/authStore';
import { AdminDashboard } from '../components/AdminDashboard';
import { MechanicDashboard } from '../components/MechanicDashboard';

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  return user?.role === 'MECHANIC' ? <MechanicDashboard /> : <AdminDashboard />;
}
