import { useState } from 'react';
import { BarChart2, Car, RefreshCw, Clock, Zap, FileText } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button } from '../../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
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
      <PageHeader
        title="Fleet Analytics"
        context={
          <span className="inline-flex items-center gap-1.5">
            <Clock aria-hidden="true" className="size-4" />
            {loading ? 'Loading…' : `Updated ${lastUpdated}`}
          </span>
        }
        action={
          <Button type="button" variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw aria-hidden="true" /> Refresh
          </Button>
        }
      />

      {costsHidden && (
        <div className="mb-4">
          <Callout tone="info" title="Costs are hidden for your role">
            Spend and cost figures need the "See costs" permission.
          </Callout>
        </div>
      )}

      <div className="mb-6">
        <SectionGate state={sections.summary} onRetry={() => retry('summary')} height={88}>
          {summary && (
            <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${costsHidden ? '' : 'xl:grid-cols-4'}`}>
              {!costsHidden && <KpiCard label="Total Repair Spend" value={fmt(summary.total_spend)} />}
              <KpiCard label="Total Repairs" value={summary.total_repairs} note={`${totalActiveTickets} currently active`} />
              <KpiCard label="Vehicles Tracked" value={summary.total_vehicles} note={`${completionRate}% completion rate`} />
              {!costsHidden && <KpiCard label="Avg Cost / Repair" value={fmt(summary.avg_cost_per_repair)} />}
            </div>
          )}
        </SectionGate>
      </div>

      {/* The suite Tabs (spec 0016): real tabs for the keyboard and screen readers, never gold text */}
      <Tabs value={shownTab} onValueChange={(next) => setTab(next as TabKey)}>
        <TabsList aria-label="Analytics views" className="max-w-full overflow-x-auto">
          {tabs.map(t => (
            <TabsTrigger key={t.key} value={t.key}>
              <t.icon aria-hidden="true" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview"><OverviewTab {...data} /></TabsContent>
        <TabsContent value="vehicles"><VehiclesTab {...data} /></TabsContent>
        {aiOn && <TabsContent value="ai"><AiInsightsTab {...data} /></TabsContent>}
        <TabsContent value="reports"><ReportsTab {...data} /></TabsContent>
      </Tabs>
    </div>
  );
}
