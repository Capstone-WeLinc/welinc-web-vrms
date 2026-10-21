import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Wrench, 
  ClipboardList, 
  AlertTriangle, 
  Truck,
  LayoutDashboard
} from 'lucide-react';
import { RepairTicket } from '../../../types';
import { formatDate } from '../../../lib/utils/format';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { useAuthStore } from '../../../store/authStore';
import { getRepairs } from '../../../lib/api/repairApi';
import { PageHeader } from '../../../components/layout/PageHeader';

export function MechanicDashboard() {
  const user = useAuthStore((state) => state.user);
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load(silent = false) {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const resp = await getRepairs();
        setRepairs(resp.data);
      } catch {
        if (!silent) {
          setError('Unable to load your assigned repairs.');
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    }
    load(false);

    const interval = setInterval(() => {
      load(true);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const activeRepairs = useMemo(
    () =>
      repairs
        .filter((r) => r.status === 'PENDING' || r.status === 'IN_PROGRESS')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [repairs],
  );

  const pendingCount = repairs.filter((r) => r.status === 'PENDING').length;
  const inProgressCount = repairs.filter((r) => r.status === 'IN_PROGRESS').length;
  const forVerificationCount = repairs.filter((r) => r.status === 'FOR_VERIFICATION').length;

  const overdue = useMemo(
    () =>
      repairs.filter(
        (r) =>
          r.targetDueDate &&
          new Date(r.targetDueDate) < new Date() &&
          r.status !== 'COMPLETED' &&
          r.status !== 'CANCELLED',
      ),
    [repairs],
  );

  const mechanicSummaryCards = [
    {
      label: 'Pending',
      value: pendingCount,
      note: 'Not yet started.',
      icon: ClipboardList,
      color: 'var(--warning)',
      bgColor: 'var(--warning-soft)',
    },
    {
      label: 'In Progress',
      value: inProgressCount,
      note: 'Currently being worked on.',
      icon: Wrench,
      color: 'var(--primary)',
      bgColor: 'rgba(59, 130, 246, 0.1)',
    },
    {
      label: 'For Verification',
      value: forVerificationCount,
      note: 'Awaiting admin sign-off.',
      icon: AlertTriangle,
      color: 'var(--danger)',
      bgColor: 'var(--danger-soft)',
    },
    {
      label: 'Total Active',
      value: activeRepairs.length,
      note: 'All tickets assigned to you.',
      icon: Truck,
      color: 'var(--primary)',
      bgColor: 'var(--primary-soft)',
    },
  ];

  return (
    <div className="dashboard-page">
      <PageHeader
        title="My Assigned Repairs"
        subtitle={`Welcome back, ${user?.name ?? 'Mechanic'} — Fleet Mechanic. Here are your current assignments.`}
        icon={LayoutDashboard}
      />

      <div className="dashboard-grid">
        {mechanicSummaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card summary-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="stat-card-header">
                <div 
                  className="stat-card-icon-container" 
                  style={{ background: card.bgColor, color: card.color }}
                >
                  <Icon size={20} strokeWidth={1.8} />
                </div>
              </div>
              <div className="stat-card-value">{card.value}</div>
              <div className="stat-card-label">{card.label}</div>
              <div className="stat-card-note">{card.note}</div>
            </div>
          );
        })}
      </div>

      {overdue.length > 0 && (
        <div className="alert">
          <strong>Overdue:</strong>{' '}
          {overdue.length} ticket{overdue.length === 1 ? '' : 's'} passed their target due date.
        </div>
      )}

      <div className="card">
        <div className="page-header">
          <div>
            <h3>My active tickets</h3>
            <p className="page-subtitle">Tickets currently assigned to you.</p>
          </div>
          <Link to="/repairs" className="button secondary">
            View all
          </Link>
        </div>

        {loading ? (
          <p>Loading your repairs…</p>
        ) : error ? (
          <div className="alert">{error}</div>
        ) : activeRepairs.length === 0 ? (
          <p style={{ color: 'var(--muted-foreground)' }}>No active repairs assigned to you right now.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Repair #</th>
                <th>Vehicle</th>
                <th>Status</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {activeRepairs.map((repair) => (
                <tr key={repair.id}>
                  <td>{repair.repairNumber}</td>
                  <td>{repair.vehiclePlate}</td>
                  <td>
                    <StatusBadge status={repair.status} />
                  </td>
                  <td>{formatDate(repair.updatedAt)}</td>
                  <td>
                    <Link to={`/repairs/${repair.id}`} style={{ color: 'var(--primary)', fontWeight: 700 }}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
