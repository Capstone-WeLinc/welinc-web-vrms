import { useState } from 'react';
import { BarChart2, Car, RefreshCw, Clock, Zap, FileText } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { useAnalyticsData } from '../hooks/useAnalyticsData';
import { KpiCard, SectionGate } from '../components/ChartPrimitives';
import { Callout } from '../../../components/shared/Callout';
import { OverviewTab } from '../components/OverviewTab';
import { VehiclesTab } from '../components/VehiclesTab';
import { AiInsightsTab } from '../components/AiInsightsTab';
import { ReportsTab } from '../components/ReportsTab';
import { fmt } from '../utils';
import { useModuleOn } from '../../../lib/permissions/usePermissions';

const TABS = [
  { key: 'overview', label: 'Fleet Overview', icon: BarChart2 },
  { key: 'vehicles', label: 'Vehicle & Costs', icon: Car },
  { key: 'ai', label: 'AI Insights', icon: Zap },
  { key: 'reports', label: 'Reports', icon: FileText },
] as const;

type TabKey = typeof TABS[number]['key'];

export function AnalyticsPage() {
  const [tab, setTab] = useState<TabKey>('overview');
  // Spec 0012, AC-13: the AI Insights tab hides while AI is off; the rest of the page works
  const aiOn = useModuleOn('ai');
  const tabs = aiOn ? TABS : TABS.filter(t => t.key !== 'ai');
  const shownTab: TabKey = !aiOn && tab === 'ai' ? 'overview' : tab;
  const data = useAnalyticsData(aiOn);
  const { loading, lastUpdated, refresh, summary, statusBreakdown, sections, retry, costsHidden } = data;

  const totalActiveTickets = statusBreakdown.filter(s => !['CLOSED', 'CANCELLED'].includes(s.status)).reduce((a, b) => a + Number(b.count), 0);
  const completedCount = statusBreakdown.find(s => s.status === 'CLOSED')?.count || 0;
  const totalAll = statusBreakdown.reduce((a, b) => a + Number(b.count), 0);
  const completionRate = totalAll > 0 ? Math.round((Number(completedCount) / totalAll) * 100) : 0;

  return (
    <div className="dashboard-page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <PageHeader
          title="Fleet Analytics"
          context="Vehicle Repair Management System — Analytics Dashboard"
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted-foreground)', fontSize: '0.78rem' }}>
            <Clock size={13} />
            <span>{loading ? 'Loading…' : `Updated ${lastUpdated}`}</span>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {costsHidden && (
        <div style={{ marginBottom: 16 }}>
          <Callout tone="info" title="Costs are hidden for your role">
            Spend and cost figures need the "See costs" permission.
          </Callout>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <SectionGate state={sections.summary} onRetry={() => retry('summary')} height={88}>
          {summary && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${costsHidden ? 2 : 4}, 1fr)`, gap: 14 }}>
              {!costsHidden && <KpiCard label="Total Repair Spend" value={fmt(summary.total_spend)} />}
              <KpiCard label="Total Repairs" value={summary.total_repairs} note={`${totalActiveTickets} currently active`} />
              <KpiCard label="Vehicles Tracked" value={summary.total_vehicles} note={`${completionRate}% completion rate`} />
              {!costsHidden && <KpiCard label="Avg Cost / Repair" value={fmt(summary.avg_cost_per_repair)} />}
            </div>
          )}
        </SectionGate>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.15s',
                color: shownTab === t.key ? 'var(--highlight)' : 'var(--muted-foreground)',
                borderBottom: shownTab === t.key ? '2px solid var(--highlight)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {shownTab === 'overview' && <OverviewTab {...data} />}
      {shownTab === 'vehicles' && <VehiclesTab {...data} />}
      {shownTab === 'ai' && <AiInsightsTab {...data} />}
      {shownTab === 'reports' && <ReportsTab {...data} />}
    </div>
  );
}
