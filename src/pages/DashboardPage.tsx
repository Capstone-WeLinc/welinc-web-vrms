import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Wrench, 
  ClipboardList, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  TrendingUp, 
  Truck,
  LayoutDashboard,
  Lock
} from 'lucide-react';
import { RepairTicket } from '../types';
import { formatDate } from '../lib/utils/format';
import { StatusBadge } from '../components/shared/StatusBadge';
import { Button } from '../components/ui/Button';
import { REPAIR_VOLUME, SAMPLE_REPAIRS, STATUS_DISTRIBUTION } from '../lib/mockData';
import { downloadRepairsCSV, downloadSummaryCSV } from '../lib/export';
import { SAMPLE_AUDITS } from '../lib/mockAudit';
import { useAuthStore } from '../store/authStore';
import { getRepairs, getRepairHistory, getAuditLogs, AuditEntry } from '../lib/api/repairApi';
import { PageHeader } from '../components/layout/PageHeader';

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  FOR_VERIFICATION: 'For Verification',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const orderedStatus: Array<string> = [
  'PENDING',
  'IN_PROGRESS',
  'FOR_VERIFICATION',
  'COMPLETED',
  'CANCELLED',
];

function AdminDashboard() {
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [audits, setAudits] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [activeData, historyData, auditData] = await Promise.all([
          getRepairs(),
          getRepairHistory(),
          getAuditLogs().catch(() => []),
        ]);
        setRepairs([...activeData, ...historyData]);
        setAudits(auditData);
      } catch (err) {
        console.error('Failed to load repairs:', err);
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

  const latestRepairs = useMemo(
    () => [...repairs].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 8),
    [repairs],
  );

  const statusDistribution = useMemo(() => {
    const dist: Record<string, number> = {
      PENDING: 0,
      IN_PROGRESS: 0,
      FOR_VERIFICATION: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    repairs.forEach((r) => {
      if (r.status in dist) {
        dist[r.status]++;
      }
    });
    return dist;
  }, [repairs]);

  const repairVolume = useMemo(() => {
    const weeks = [
      { label: 'Week 1', repairs: 0 },
      { label: 'Week 2', repairs: 0 },
      { label: 'Week 3', repairs: 0 },
      { label: 'Week 4', repairs: 0 },
      { label: 'Week 5', repairs: 0 },
    ];
    repairs.forEach((r) => {
      const date = new Date(r.createdAt);
      const day = date.getDate();
      if (day <= 7) weeks[0].repairs++;
      else if (day <= 14) weeks[1].repairs++;
      else if (day <= 21) weeks[2].repairs++;
      else if (day <= 28) weeks[3].repairs++;
      else weeks[4].repairs++;
    });
    return weeks;
  }, [repairs]);

  const monthlyStats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const currentMonthRepairs = repairs.filter((r) => {
      const date = new Date(r.createdAt);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    const totalCost = currentMonthRepairs.reduce((sum, r) => sum + (r.totalCost ?? 0), 0);
    return {
      count: currentMonthRepairs.length,
      cost: totalCost,
    };
  }, [repairs]);

  const auditCount = audits.length;
  const lastAudit = audits[0] ? new Date(audits[0].timestamp) : null;

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
      icon: Wrench,
      color: 'var(--primary)',
      bgColor: 'var(--primary-soft)',
    },
    {
      label: 'Open tickets',
      value: summary.open,
      note: 'Tickets currently in progress or awaiting review.',
      icon: ClipboardList,
      color: 'var(--warning)',
      bgColor: 'var(--warning-soft)',
    },
    {
      label: 'Pending verification',
      value: summary.forVerification,
      note: 'Repairs waiting approval before completion.',
      icon: AlertTriangle,
      color: 'var(--danger)',
      bgColor: 'var(--danger-soft)',
    },
    {
      label: 'Completed',
      value: summary.completed,
      note: 'Repair tickets already closed out.',
      icon: CheckCircle2,
      color: 'var(--success)',
      bgColor: 'var(--success-soft)',
    },
  ];

  const highlightCards = [
    {
      label: 'Total repair cost',
      value: `₱${totalCost.toLocaleString()}`,
      note: 'Projected spend for all active repair tickets.',
      icon: DollarSign,
      color: '#8b5cf6',
      bgColor: 'rgba(139, 92, 246, 0.1)',
    },
    {
      label: 'Average cost',
      value: `₱${averageCost.toLocaleString()}`,
      note: 'Average cost per repair ticket.',
      icon: TrendingUp,
      color: '#3b82f6',
      bgColor: 'rgba(59, 130, 246, 0.1)',
    },
  ];

  const reportButtons = ['Daily', 'Monthly', 'Yearly'];

  const chartMax = Math.max(...repairVolume.map((item) => item.repairs), 1);

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Vehicle Repair Management"
        subtitle="Monitor ticket flow, status changes, and repair costs with live data."
        icon={LayoutDashboard}
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button type="button" onClick={() => downloadRepairsCSV(repairs)}>Export CSV</Button>
            <Button type="button" onClick={() => downloadSummaryCSV({ ...summary, totalCost, averageCost })}>Export summary</Button>
          </div>
        }
      />

      <div className="dashboard-grid">
        {summaryCards.map((card) => {
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

      <div className="dashboard-grid dashboard-grid-2">
        <div className="card chart-panel">
          <div className="page-header">
            <div>
              <h3 className="subheading">Repair volume</h3>
              <p className="page-subtitle">Weekly repairs for the current month.</p>
            </div>
          </div>
          <div className="chart-card">
            {repairVolume.map((item) => (
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
                <p className="status-value">{statusDistribution[statusKey]}</p>
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
        {highlightCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card card-highlight" style={{ display: 'flex', flexDirection: 'column' }}>
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

      <div className="dashboard-grid report-grid">
        <div className="card report-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--divider)', paddingBottom: 12, marginBottom: 16 }}>
            <div>
              <h3 className="subheading" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, margin: 0 }}>
                Audit Trail
                <span style={{ 
                  backgroundColor: 'var(--primary-soft)', 
                  color: 'var(--primary)', 
                  padding: '2px 8px', 
                  borderRadius: 12, 
                  fontSize: 12, 
                  fontWeight: 600 
                }}>
                  {auditCount}
                </span>
              </h3>
              <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', fontSize: 13 }}>Recent system activities & security events</p>
            </div>
            {lastAudit && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Event</p>
                <p style={{ margin: '2px 0 0 0', fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>{lastAudit.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, position: 'relative', paddingLeft: 16, borderLeft: '2px solid #e2e8f0' }}>
            {audits.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 14, margin: '20px 0', textAlign: 'center' }}>No audit trail entries recorded yet.</p>
            ) : (
              audits.slice(0, 4).map((a) => {
                // Determine bullet indicator colors based on action type
                let indicatorColor = 'var(--primary)';
                if (a.action.includes('COMPLETED') || a.action.includes('Verification')) {
                  indicatorColor = 'var(--success)';
                } else if (a.action.includes('Unlock') || a.action.includes('unlocked')) {
                  indicatorColor = 'var(--warning)';
                } else if (a.action.includes('Cancelled') || a.action.includes('lockout')) {
                  indicatorColor = 'var(--danger)';
                }

                return (
                  <div key={a.id} style={{ position: 'relative' }}>
                    {/* Timeline bullet node */}
                    <div style={{
                      position: 'absolute',
                      left: -23,
                      top: 4,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: indicatorColor,
                      border: '2px solid white',
                      boxShadow: '0 0 0 1px #cbd5e1'
                    }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>@{a.user}</span>
                          <span style={{ 
                            fontSize: 10, 
                            backgroundColor: '#f1f5f9', 
                            color: '#475569', 
                            padding: '1px 6px', 
                            borderRadius: 4, 
                            fontWeight: 600,
                            textTransform: 'uppercase'
                          }}>
                            {a.action.split(' ')[0]}
                          </span>
                        </div>
                        <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>{a.action}</div>
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {new Date(a.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card report-card">
          <h3 className="subheading">Reports & exports</h3>
          <p style={{ color: 'var(--muted)' }}>Generate quick reports for management.</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            {reportButtons.map((label) => (
              <Button key={label} type="button">
                {label}
              </Button>
            ))}
          </div>

          <div style={{ marginTop: 14 }}>
            <p style={{ margin: 0, color: 'var(--muted)' }}>This preview shows monthly repair volume and cost estimates.</p>
            <p style={{ marginTop: 6, fontWeight: 700 }}>Repairs this month: {monthlyStats.count}</p>
            <p style={{ margin: 0, color: 'var(--muted)' }}>Estimated cost: ₱{monthlyStats.cost.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="page-header">
          <div>
            <h3>Latest repair tickets</h3>
            <p className="page-subtitle">Recent tickets, status, and cost snapshot.</p>
          </div>
          <Link to="/history" className="button secondary">
            View all history
          </Link>
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
              {latestRepairs.map((repair) => {
                const isLocked = repair.status === 'COMPLETED' || repair.status === 'CANCELLED';
                return (
                  <tr key={repair.id} style={isLocked ? { opacity: 0.65 } : undefined}>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Link to={`/repairs/${repair.id}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                          {repair.repairNumber}
                        </Link>
                        {isLocked && <Lock size={12} style={{ color: 'var(--muted)' }} />}
                      </div>
                    </td>
                    <td>{repair.vehiclePlate}</td>
                    <td>{repair.driverName}</td>
                    <td>₱{(repair.totalCost ?? 0).toLocaleString()}</td>
                    <td>
                      <StatusBadge status={repair.status} />
                    </td>
                    <td>{formatDate(repair.updatedAt)}</td>
                  </tr>
                );
              })}
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
      color: '#3b82f6',
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
        subtitle={`Welcome back, ${user?.name ?? 'Mechanic'}. Here are your current assignments.`}
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
