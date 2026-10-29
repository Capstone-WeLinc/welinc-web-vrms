import { useState } from 'react';
import { BarChart2, TrendingUp, Wrench, Car, PhilippinePeso, RefreshCw, Clock, Zap, FileText } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { useAnalyticsData } from '../hooks/useAnalyticsData';
import { KpiCard } from '../components/ChartPrimitives';
import { OverviewTab } from '../components/OverviewTab';
import { VehiclesTab } from '../components/VehiclesTab';
import { AiInsightsTab } from '../components/AiInsightsTab';
import { ReportsTab } from '../components/ReportsTab';
import { fmt } from '../utils';

const TABS = [
  { key: 'overview', label: 'Fleet Overview', icon: BarChart2 },
  { key: 'vehicles', label: 'Vehicle & Costs', icon: Car },
  { key: 'ai', label: 'AI Insights', icon: Zap },
  { key: 'reports', label: 'Reports', icon: FileText },
] as const;

type TabKey = typeof TABS[number]['key'];

export function AnalyticsPage() {
  const [tab, setTab] = useState<TabKey>('overview');
  const data = useAnalyticsData();
  const { loading, lastUpdated, refresh, summary, statusBreakdown } = data;

  const totalActiveTickets = statusBreakdown.filter(s => !['CLOSED', 'CANCELLED'].includes(s.status)).reduce((a, b) => a + Number(b.count), 0);
  const completedCount = statusBreakdown.find(s => s.status === 'CLOSED')?.count || 0;
  const totalAll = statusBreakdown.reduce((a, b) => a + Number(b.count), 0);
  const completionRate = totalAll > 0 ? Math.round((Number(completedCount) / totalAll) * 100) : 0;

  if (loading) return (
    <div className="dashboard-page">
      <PageHeader title="Fleet Analytics" subtitle="Loading dashboard data..." icon={BarChart2} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="premium-card" style={{ height: 88, background: 'var(--surface)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="premium-card" style={{ height: 260, background: 'var(--surface)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="dashboard-page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <PageHeader
          title="Fleet Analytics"
          subtitle="Vehicle Repair Management System — Analytics Dashboard"
          icon={BarChart2}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted-foreground)', fontSize: '0.78rem' }}>
            <Clock size={13} />
            <span>Updated {lastUpdated}</span>
          </div>
          <button
            onClick={refresh}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          <KpiCard label="Total Repair Spend" value={fmt(summary.total_spend)} icon={PhilippinePeso} color="var(--primary)" />
          <KpiCard label="Total Repairs" value={summary.total_repairs} icon={Wrench} color="var(--primary)" note={`${totalActiveTickets} currently active`} />
          <KpiCard label="Vehicles Tracked" value={summary.total_vehicles} icon={Car} color="var(--success)" note={`${completionRate}% completion rate`} />
          <KpiCard label="Avg Cost / Repair" value={fmt(summary.avg_cost_per_repair)} icon={TrendingUp} color="var(--warning)" />
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.15s',
                color: tab === t.key ? 'var(--highlight)' : 'var(--muted-foreground)',
                borderBottom: tab === t.key ? '2px solid var(--highlight)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && <OverviewTab {...data} />}
      {tab === 'vehicles' && <VehiclesTab {...data} />}
      {tab === 'ai' && <AiInsightsTab {...data} />}
      {tab === 'reports' && <ReportsTab {...data} />}
    </div>
  );
}
