import { useEffect, useMemo, useState } from 'react';
import { getRepairs } from '../lib/api/repairApi';
import { RepairTicket } from '../types';
import { formatDate } from '../lib/utils/format';
import { StatusBadge } from '../components/shared/StatusBadge';
import { Button } from '../components/ui/Button';

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  FOR_VERIFICATION: 'For Verification',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export function DashboardPage() {
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await getRepairs();
        setRepairs(data);
      } catch (err) {
        setError('Unable to load repair tickets.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const summary = useMemo(
    () => ({
      total: repairs.length,
      pending: repairs.filter((r) => r.status === 'PENDING').length,
      inProgress: repairs.filter((r) => r.status === 'IN_PROGRESS').length,
      forVerification: repairs.filter((r) => r.status === 'FOR_VERIFICATION').length,
      completed: repairs.filter((r) => r.status === 'COMPLETED').length,
      cancelled: repairs.filter((r) => r.status === 'CANCELLED').length,
      open: repairs.filter((r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED').length,
    }),
    [repairs],
  );

  const alerts = [] as string[];
  if (summary.forVerification > 0) {
    alerts.push(`${summary.forVerification} repair ticket${summary.forVerification === 1 ? '' : 's'} require verification.`);
  }
  if (summary.pending > 0) {
    alerts.push(`${summary.pending} repair ticket${summary.pending === 1 ? '' : 's'} are pending assignment or action.`);
  }

  return (
    <div>
      <div className="dashboard-hero">
        <div className="card dashboard-card">
          <div className="page-header">
            <div>
              <h2 className="page-title">Dashboard</h2>
              <p className="page-subtitle">Real-time repair analytics, alerts, and summary insights for VRMS.</p>
            </div>
            <Button type="button">Generate report</Button>
          </div>
          <div className="dashboard-grid">
            <div className="card dashboard-card" style={{ padding: '20px 24px' }}>
              <h3>Total repairs</h3>
              <p style={{ fontSize: 34, margin: 0, color: '#1d4ed8' }}>{summary.total}</p>
              <p style={{ margin: '12px 0 0', color: '#475569' }}>All active repair tickets across VRMS.</p>
            </div>
            <div className="card dashboard-card" style={{ padding: '20px 24px' }}>
              <h3>Open tickets</h3>
              <p style={{ fontSize: 34, margin: 0, color: '#0f172a' }}>{summary.open}</p>
              <p style={{ margin: '12px 0 0', color: '#475569' }}>Tickets still in progress or pending review.</p>
            </div>
            <div className="card dashboard-card" style={{ padding: '20px 24px' }}>
              <h3>Pending verification</h3>
              <p style={{ fontSize: 34, margin: 0, color: '#1d4ed8' }}>{summary.forVerification}</p>
              <p style={{ margin: '12px 0 0', color: '#475569' }}>Repairs that require administrative approval.</p>
            </div>
            <div className="card dashboard-card" style={{ padding: '20px 24px' }}>
              <h3>Completed</h3>
              <p style={{ fontSize: 34, margin: 0, color: '#16a34a' }}>{summary.completed}</p>
              <p style={{ margin: '12px 0 0', color: '#475569' }}>Finished repairs moved to history.</p>
            </div>
          </div>
        </div>

        <div className="card dashboard-card">
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Quick insights</h3>
          <p style={{ margin: 0, color: '#475569' }}>
            This dashboard reflects the key operational metrics for the web admin portal, including repair status distribution, verification alerts, and repair throughput.
          </p>
        </div>
      </div>

      {alerts.length > 0 ? (
        <div className="alert" style={{ marginBottom: 24 }}>
          <strong>Action required:</strong> {alerts.join(' ')}
        </div>
      ) : (
        <div className="alert" style={{ marginBottom: 24, background: '#eff6ff', borderColor: '#bfdbfe' }}>
          No active alerts at the moment. System performance is stable.
        </div>
      )}

      <div className="card">
        <div className="page-header">
          <div>
            <h3 style={{ margin: 0 }}>Latest repair tickets</h3>
            <p style={{ margin: '8px 0 0', color: '#475569' }}>Most recent repairs with ticket status and activity.</p>
          </div>
        </div>

        {loading ? (
          <p>Loading repair tickets…</p>
        ) : error ? (
          <div className="alert">{error}</div>
        ) : repairs.length === 0 ? (
          <p>No repair tickets found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Repair #</th>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {repairs.slice(0, 8).map((repair) => (
                <tr key={repair.id}>
                  <td>{repair.repairNumber}</td>
                  <td>{repair.vehiclePlate}</td>
                  <td>{repair.driverName}</td>
                  <td>
                    <StatusBadge status={repair.status} />
                  </td>
                  <td>{formatDate(repair.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
