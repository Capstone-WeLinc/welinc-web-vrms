import { useCan } from '../../../lib/permissions/usePermissions';
import { AdminDashboard } from '../components/AdminDashboard';
import { ChiefDashboard } from '../components/ChiefDashboard';
import { MechanicDashboard } from '../components/MechanicDashboard';

/**
 * Chosen from permissions, never the role name. Work, verify and see all without administering gets the
 * Chief view (spec 0015, AC-11); work without administering gets your own work (spec 0011, AC-14); everyone
 * else the overview. A caller with administer acts as an Admin, as on the server (AC-12).
 */
export function DashboardPage() {
  const works = useCan('ticket.work');
  const verifies = useCan('ticket.verify');
  const seesAll = useCan('ticket.view_all');
  const administers = useCan('ticket.administer');
  if (works && !administers) {
    return verifies && seesAll ? <ChiefDashboard /> : <MechanicDashboard />;
  }
  return <AdminDashboard />;
}
