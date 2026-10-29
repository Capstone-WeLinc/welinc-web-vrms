import { useCan } from '../../../lib/permissions/usePermissions';
import { AdminDashboard } from '../components/AdminDashboard';
import { MechanicDashboard } from '../components/MechanicDashboard';

/**
 * Your own work when you work tickets without administering them (spec 0011, AC-14), else the
 * overview. A caller with both acts as administer, as on the server (AC-12).
 */
export function DashboardPage() {
  const works = useCan('ticket.work');
  const administers = useCan('ticket.administer');
  return works && !administers ? <MechanicDashboard /> : <AdminDashboard />;
}
