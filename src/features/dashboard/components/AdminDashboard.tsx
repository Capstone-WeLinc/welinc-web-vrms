import { Link } from 'react-router-dom';
import { 
  Wrench, 
  ClipboardList, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp,
  LayoutDashboard,
  PhilippinePeso,
  ChevronDown
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { PageHeader } from '../../../components/layout/PageHeader';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import { AuditTrailWidget } from './AuditTrailWidget';
import { RecentRepairsTable } from './RecentRepairsTable';
import { RepairProgressChart } from './RepairProgressChart';

export function AdminDashboard() {
  const {
    repairs,
    audits,
    loading,
    error,
    summary,
    totalCost,
    averageCost,
    topRepairs,
    latestRepairs,
    monthlyStats,
  } = useDashboardMetrics();

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
      link: '/repairs',
    },
    {
      label: 'Open tickets',
      value: summary.open,
      note: 'Tickets currently in progress or awaiting review.',
      icon: ClipboardList,
      color: 'var(--warning)',
      bgColor: 'var(--warning-soft)',
      link: '/repairs',
    },
    {
      label: 'Pending verification',
      value: summary.forVerification,
      note: 'Repairs waiting approval before completion.',
      icon: AlertTriangle,
      color: 'var(--danger)',
      bgColor: 'var(--danger-soft)',
      link: '/repairs',
    },
    {
      label: 'Completed',
      value: summary.completed,
      note: 'Repair tickets already closed out.',
      icon: CheckCircle2,
      color: 'var(--success)',
      bgColor: 'var(--success-soft)',
      link: '/repairs',
    },
  ];

  const highlightCards = [
    {
      label: 'Total repair cost',
      value: `₱${totalCost.toLocaleString()}`,
      note: 'Projected spend for all active repair tickets.',
      icon: PhilippinePeso,
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

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Vehicle Repair Management"
        subtitle="Monitor ticket flow, status changes, and repair costs with live data."
        icon={LayoutDashboard}
        action={
          <div style={{ position: 'relative' }}>
            <select 
              className="select" 
              style={{ appearance: 'none', paddingRight: '36px', cursor: 'pointer', background: 'var(--surface)', fontWeight: 600 }}
              defaultValue=""
            >
              <option value="" disabled>Export Reports...</option>
              <option value="csv">Export to CSV</option>
              <option value="pdf">Export to PDF</option>
            </select>
            <div style={{ position: 'absolute', right: 12, top: 14, pointerEvents: 'none', color: 'var(--muted)' }}>
              <ChevronDown size={18} />
            </div>
          </div>
        }
      />

      <div className="dashboard-grid">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} to={card.link} className="card summary-card" style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none' }}>
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
            </Link>
          );
        })}
      </div>

      <RepairProgressChart repairs={repairs} />

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
        <AuditTrailWidget audits={audits} />

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

        <RecentRepairsTable repairs={latestRepairs} loading={loading} error={error} />
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
