import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RepairTicket } from '../types';
import { formatDate } from '../lib/utils/format';
import { StatusBadge } from '../components/shared/StatusBadge';
import { Button } from '../components/ui/Button';
import { REPAIR_VOLUME, SAMPLE_REPAIRS, STATUS_DISTRIBUTION } from '../lib/mockData';
import { downloadRepairsCSV } from '../lib/export';
import { SAMPLE_AUDITS, REPORT_STATS } from '../lib/mockAudit';
import { useAuthStore } from '../store/authStore';
import { getRepairs } from '../lib/api/repairApi';

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  FOR_VERIFICATION: 'For Verification',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const orderedStatus: Array<keyof typeof STATUS_DISTRIBUTION> = [
  'PENDING',
  'IN_PROGRESS',
  'FOR_VERIFICATION',
  'COMPLETED',
  'CANCELLED',
];

function AdminDashboard() {
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRepairs(SAMPLE_REPAIRS);
      setLoading(false);
      setError(null);
    }, 260);

    return () => window.clearTimeout(timer);
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

  const totalCost = useMemo(
    () => repairs.reduce((sum, repair) => sum + (repair.totalCost ?? 0), 0),
    [repairs],
  );

  const averageCost = useMemo(() => {
    const paidRepairs = repairs.filter((repair) => repair.totalCost && repair.totalCost > 0);
    if (!paidRepairs.length) return 0;
    return Math.round(paidRepairs.reduce((sum, repair) => sum + (repair.totalCost ?? 0), 0) / paidRepairs.length);
  }, [repairs]);

  const topRepairs = useMemo(
    () => [...repairs].sort((a, b) => (b.totalCost ?? 0) - (a.totalCost ?? 0)).slice(0, 4),
    [repairs],
  );

  const auditCount = REPORT_STATS.audits;
  const lastAudit = REPORT_STATS.lastAudit ? new Date(REPORT_STATS.lastAudit) : null;

  const alerts: string[] = [];
  if (summary.forVerification > 0) {
    alerts.push(`${summary.forVerification} ticket${summary.forVerification === 1 ? '' : 's'} require verification.`);
  }
  if (summary.pending > 0) {
    alerts.push(`${summary.pending} ticket${summary.pending === 1 ? '' : 's'} are still pending assignment.`);
  }

  const summaryCards = [
    {
      label: 'Total repairs',
      value: summary.total,
      note: 'All repair tickets in the current period.',
    },
    {
      label: 'Open tickets',
      value: summary.open,
      note: 'Tickets currently in progress or awaiting review.',
    },
    {
      label: 'Pending verification',
      value: summary.forVerification,
      note: 'Repairs waiting approval before completion.',
    },
    {
      label: 'Completed',
      value: summary.completed,
      note: 'Repair tickets already closed out.',
    },
  ];

  const highlightCards = [
    {
      label: 'Total repair cost',
      value: `₱${totalCost.toLocaleString()}`,
      note: 'Projected spend for all active repair tickets.',
    },
    {
      label: 'Average cost',
      value: `₱${averageCost.toLocaleString()}`,
      note: 'Average cost per repair ticket.',
    },
  ];

  const reportButtons = ['Daily', 'Monthly', 'Yearly'];

  const chartMax = Math.max(...REPAIR_VOLUME.map((item) => item.repairs), 1);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Operations dashboard</p>
          <h2 className="page-title">Vehicle repair management</h2>
          <p className="page-subtitle">
            Monitor ticket flow, status changes, and repair costs with temporary preview data.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button type="button" onClick={() => downloadRepairsCSV(repairs)}>Export CSV</Button>
          <Button type="button">Export summary</Button>
        </div>
      </div>

      <div className="dashboard-grid">
        {summaryCards.map((card) => (
          <div key={card.label} className="card summary-card">
            <p className="summary-label">{card.label}</p>
            <p className="summary-value">{card.value}</p>
            <p className="summary-note">{card.note}</p>
          </div>
        ))}
      </div>

      <div className="dashboard-grid dashboard-grid-2">
        <div className="card chart-panel">
          <div className="page-header">
            <div>
              <h3 className="subheading">Repair volume</h3>
              <p className="page-subtitle">Weekly repairs for the current month.</p>
            </div>
          </div>
          <div className="chart-card">
            {REPAIR_VOLUME.map((item) => (
              <div key={item.label} className="chart-row">
                <span className="chart-label">{item.label}</span>
                <div className="chart-track">
                  <div className="chart-bar" style={{ width: `${(item.repairs / chartMax) * 100}%` }} />
                </div>
                <span className="chart-value">{item.repairs}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card chart-panel">
          <div className="page-header">
            <div>
              <h3 className="subheading">Status distribution</h3>
              <p className="page-subtitle">Current repair state breakdown.</p>
            </div>
          </div>
          <div className="status-grid">
            {orderedStatus.map((statusKey) => (
              <div key={statusKey} className="status-summary-card">
                <p className="status-name">{statusLabels[statusKey]}</p>
                <p className="status-value">{STATUS_DISTRIBUTION[statusKey]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {alerts.length > 0 ? (
        <div className="alert dashboard-alert">
          <strong>Action required:</strong> {alerts.join(' ')}
        </div>
      ) : (
        <div className="alert dashboard-alert info-alert">
          No active operational alerts at the moment. System status is stable.
        </div>
      )}

      <div className="dashboard-grid">
        {highlightCards.map((card) => (
          <div key={card.label} className="card card-highlight">
            <p className="summary-label">{card.label}</p>
            <p className="summary-value">{card.value}</p>
            <p className="summary-note">{card.note}</p>
          </div>
        ))}
      </div>

      <div className="dashboard-grid report-grid">
        <div className="card report-card">
          <h3 className="subheading">Audit trail</h3>
          <p style={{ marginTop: 8, marginBottom: 6, color: 'var(--muted)' }}>Recent system audit activity</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 20 }}>{auditCount}</p>
              <p style={{ margin: 6, color: 'var(--muted)' }}>audit entries</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, color: 'var(--muted)' }}>Last activity</p>
              <p style={{ margin: 6, fontWeight: 700 }}>{lastAudit ? lastAudit.toLocaleString() : '—'}</p>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            {SAMPLE_AUDITS.slice(0, 3).map((a) => (
              <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid #eef2f7' }}>
                <div style={{ fontWeight: 700 }}>{a.user}</div>
                <div style={{ color: 'var(--muted)' }}>{a.action}</div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(a.timestamp).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card report-card">
          <h3 className="subheading">Reports & exports</h3>
          <p style={{ color: 'var(--muted)' }}>Generate quick reports for management (dummy preview).</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            {reportButtons.map((label) => (
              <Button key={label} type="button">
                {label}
              </Button>
            ))}
          </div>

          <div style={{ marginTop: 14 }}>
            <p style={{ margin: 0, color: 'var(--muted)' }}>This preview shows monthly repair volume and cost estimates.</p>
            <p style={{ marginTop: 6, fontWeight: 700 }}>Repairs this month: {REPORT_STATS.monthlyRepairs}</p>
            <p style={{ margin: 0, color: 'var(--muted)' }}>Estimated cost: ₱{REPORT_STATS.monthlyCost.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="page-header">
          <div>
            <h3>Latest repair tickets</h3>
            <p className="page-subtitle">Recent tickets, status, and cost snapshot.</p>
          </div>
          <Button variant="secondary" type="button">
            View all history
          </Button>
        </div>

        {loading ? (
          <div aria-live="polite" aria-busy="true">
            <div className="skeleton skeleton-line short" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton-table-row">
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line" />
            </div>
            <div className="skeleton-table-row">
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line" />
            </div>
            <div className="skeleton-table-row">
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line" />
            </div>
          </div>
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
                <th>Cost</th>
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
                  <td>₱{(repair.totalCost ?? 0).toLocaleString()}</td>
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

      <div className="card">
        <h3 className="subheading" style={{ marginBottom: 14 }}>Top cost repairs</h3>
        <div className="top-repair-list">
          {topRepairs.map((repair) => (
            <div key={repair.id} className="top-repair-item">
              <div>
                <p className="top-repair-name">{repair.repairNumber}</p>
                <p className="summary-note">{repair.vehiclePlate} • {repair.driverName}</p>
              </div>
              <div className="top-repair-cost">₱{(repair.totalCost ?? 0).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Mechanic Dashboard ────────────────────────────────────────────────────────

function MechanicDashboard() {
  const user = useAuthStore((state) => state.user);
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
      } catch {
        setError('Unable to load your assigned repairs.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeRepairs = useMemo(
    () => repairs.filter((r) => r.status === 'PENDING' || r.status === 'IN_PROGRESS'),
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

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Mechanic dashboard</p>
          <h2 className="page-title">My assigned repairs</h2>
          <p className="page-subtitle">
            Welcome back, <strong>{user?.name ?? 'Mechanic'}</strong>. Here are your current assignments.
          </p>
        </div>
      </div>

      <div className="dashboard-grid">
        {[
          { label: 'Pending', value: pendingCount, note: 'Not yet started.' },
          { label: 'In Progress', value: inProgressCount, note: 'Currently being worked on.' },
          { label: 'For Verification', value: forVerificationCount, note: 'Awaiting admin sign-off.' },
          { label: 'Total Active', value: activeRepairs.length, note: 'All tickets assigned to you.' },
        ].map((card) => (
          <div key={card.label} className="card summary-card">
            <p className="summary-label">{card.label}</p>
            <p className="summary-value">{card.value}</p>
            <p className="summary-note">{card.note}</p>
          </div>
        ))}
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
          <p style={{ color: 'var(--muted)' }}>No active repairs assigned to you right now.</p>
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
                    <Link to={`/repairs/${repair.id}`} style={{ color: '#1d4ed8', fontWeight: 700 }}>
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

// ── Role-switching entry point ─────────────────────────────────────────────────

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  return user?.role === 'MECHANIC' ? <MechanicDashboard /> : <AdminDashboard />;
}
