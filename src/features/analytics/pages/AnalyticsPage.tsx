import { useState, useEffect, useCallback } from 'react';
import {
  BarChart2, TrendingUp, Wrench, Car, PhilippinePeso,
  AlertTriangle, RefreshCw, Clock, Zap, ThumbsUp, ThumbsDown,
  ChevronDown, ArrowUpRight, ArrowDownRight, Minus,
  FileText, Download, Activity, Shield,
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';

const API_BASE = (import.meta.env as any).VITE_API_BASE_URL || 'http://localhost:3000';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CostTrend { month: string; repair_count: number; total_spend: number; cumulative_spend: number; }
interface VehicleKpi { vehicle_plate: string; vehicle_model: string; total_repairs: number; total_parts_cost: number; avg_repair_cost: number; latest_repair_date: string | null; }
interface Summary { total_spend: number; total_repairs: number; total_vehicles: number; avg_cost_per_repair: number; }
interface StatusBreakdown { status: string; count: number; }
interface GarageCost { garage: string; repair_count: number; total_spend: number; }
interface Aging { bucket: string; count: number; }
interface Velocity { date: string; count: number; }
interface IssueFreq { description: string; occurrence_count: number; }
interface AiStats {
  total_interactions: number;
  models_used: Record<string, number>;
  satisfaction: { avg_rating: number; helpful_count: number; total_feedback: number; satisfaction_rate: number; };
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#10b981',
  IN_PROGRESS: '#3b82f6',
  PENDING: '#f59e0b',
  CANCELLED: '#6b7280',
  FOR_VERIFICATION: '#8b5cf6',
};
const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Completed',
  IN_PROGRESS: 'In Progress',
  PENDING: 'Pending',
  CANCELLED: 'Cancelled',
  FOR_VERIFICATION: 'For Verification',
};
const PERIOD_OPTIONS = ['ALL', '6M', '3M', '1M'];
const PALETTE = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) { return `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`; }

function getRisk(repairs: number) {
  if (repairs >= 10) return { label: 'HIGH', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
  if (repairs >= 5) return { label: 'MEDIUM', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
  return { label: 'LOW', color: '#10b981', bg: 'rgba(16,185,129,0.12)' };
}

function cleanIssueLabel(desc: string) {
  if (!desc) return '';
  return desc.replace(/^\[.*?\]\s*(Diagnostic|Wear and tear|Overheating|Impact damage|Electrical fault)?:\s*/i, '').trim();
}

function filterByPeriod<T extends { month?: string; date?: string }>(data: T[], period: string, key: 'month' | 'date'): T[] {
  if (period === 'ALL') return data;
  const now = new Date();
  const monthsBack = period === '1M' ? 1 : period === '3M' ? 3 : 6;
  const cutoff = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);
  return data.filter(d => {
    const raw = d[key] as string;
    if (!raw) return false;
    const parsed = key === 'month' ? new Date(raw + '-01') : new Date(raw.replace(' ', ' 1, '));
    return parsed >= cutoff;
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ChartCard({
  title, children, onPeriodChange, period, extraRight,
}: {
  title: string; children: React.ReactNode;
  onPeriodChange?: (p: string) => void; period?: string; extraRight?: React.ReactNode;
}) {
  return (
    <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {extraRight}
          {onPeriodChange && (
            <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 8, padding: 2, gap: 1 }}>
              {PERIOD_OPTIONS.map(p => (
                <button
                  key={p}
                  onClick={() => onPeriodChange(p)}
                  style={{
                    padding: '3px 9px', borderRadius: 6, border: 'none', fontSize: '0.72rem',
                    fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                    background: period === p ? 'var(--accent)' : 'transparent',
                    color: period === p ? '#fff' : 'var(--muted)',
                  }}
                >{p}</button>
              ))}
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, bg, delta, note }: {
  label: string; value: string | number; icon: any; color: string; bg: string;
  delta?: number; note?: string;
}) {
  return (
    <div className="premium-card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
        <Icon size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{value}</div>
        {delta !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            {delta > 0 ? <ArrowUpRight size={13} color="#10b981" /> : delta < 0 ? <ArrowDownRight size={13} color="#ef4444" /> : <Minus size={13} color="var(--muted)" />}
            <span style={{ fontSize: '0.72rem', color: delta > 0 ? '#10b981' : delta < 0 ? '#ef4444' : 'var(--muted)', fontWeight: 700 }}>
              {Math.abs(delta)}% vs last period
            </span>
          </div>
        )}
        {note && <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4 }}>{note}</div>}
      </div>
    </div>
  );
}

const tooltipStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  color: 'var(--text)',
  fontSize: '0.82rem',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
  padding: '8px 12px',
};
const tooltipItemStyle: React.CSSProperties = {
  color: 'var(--text)',
  fontWeight: 700,
  fontSize: '0.82rem',
};
const tooltipLabelStyle: React.CSSProperties = {
  color: 'var(--muted)',
  fontWeight: 600,
  fontSize: '0.78rem',
  marginBottom: 2,
};

// ─── Main Component ───────────────────────────────────────────────────────────
export function AnalyticsPage() {
  const [tab, setTab] = useState<'overview' | 'vehicles' | 'ai' | 'reports'>('overview');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [error, setError] = useState('');

  // Data
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trends, setTrends] = useState<CostTrend[]>([]);
  const [vehicles, setVehicles] = useState<VehicleKpi[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([]);
  const [garageCosts, setGarageCosts] = useState<GarageCost[]>([]);
  const [aging, setAging] = useState<Aging[]>([]);
  const [velocity, setVelocity] = useState<Velocity[]>([]);
  const [issueFreq, setIssueFreq] = useState<IssueFreq[]>([]);
  const [aiStats, setAiStats] = useState<AiStats | null>(null);

  // Per-chart period filters
  const [trendPeriod, setTrendPeriod] = useState('ALL');
  const [velocityPeriod, setVelocityPeriod] = useState('ALL');
  const [vehPeriod, setVehPeriod] = useState<'ALL' | 'top5' | 'top10'>('top5');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [issuePeriod, setIssuePeriod] = useState<'top5' | 'top10' | 'ALL'>('top5');
  const [reportSort, setReportSort] = useState<'month' | 'spend' | 'repairs'>('month');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [sumR, trendR, vehR, statusR, garageR, agingR, velR, issueR, aiR] = await Promise.all([
        fetch(`${API_BASE}/analytics/summary`),
        fetch(`${API_BASE}/analytics/cost-trends`),
        fetch(`${API_BASE}/analytics/vehicle-kpis`),
        fetch(`${API_BASE}/analytics/status-breakdown`),
        fetch(`${API_BASE}/analytics/garage-costs`),
        fetch(`${API_BASE}/analytics/aging`),
        fetch(`${API_BASE}/analytics/velocity`),
        fetch(`${API_BASE}/analytics/issue-frequency`),
        fetch(`${API_BASE}/ai/stats`),
      ]);
      const [sumD, trendD, vehD, statusD, garageD, agingD, velD, issueD, aiD] = await Promise.all([
        sumR.json(), trendR.json(), vehR.json(), statusR.json(),
        garageR.json(), agingR.json(), velR.json(), issueR.json(), aiR.json(),
      ]);
      setSummary(sumD);
      setTrends(trendD.data || []);
      setVehicles(vehD.data || []);
      setStatusBreakdown(statusD.data || []);
      setGarageCosts(garageD.data || []);
      setAging(agingD.data || []);
      setVelocity(velD.data || []);
      setIssueFreq(issueD.data || []);
      setAiStats(aiD);
      setLastUpdated(new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      setError('Could not connect to analytics service. Make sure the AI microservice is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Derived / filtered data
  const filteredTrends = filterByPeriod(trends, trendPeriod, 'month');
  const filteredVelocity = filterByPeriod(velocity, velocityPeriod, 'date');
  const filteredVehicles = vehPeriod === 'top5' ? vehicles.slice(0, 5) : vehPeriod === 'top10' ? vehicles.slice(0, 10) : vehicles;
  const filteredStatus = statusFilter === 'ALL' ? statusBreakdown : statusBreakdown.filter(s => s.status === statusFilter);
  const filteredIssues = issuePeriod === 'ALL' ? issueFreq : issueFreq.slice(0, issuePeriod === 'top5' ? 5 : 10);

  const totalActiveTickets = statusBreakdown.filter(s => !['COMPLETED', 'CANCELLED'].includes(s.status)).reduce((a, b) => a + Number(b.count), 0);
  const completedCount = statusBreakdown.find(s => s.status === 'COMPLETED')?.count || 0;
  const totalAll = statusBreakdown.reduce((a, b) => a + Number(b.count), 0);
  const completionRate = totalAll > 0 ? Math.round((Number(completedCount) / totalAll) * 100) : 0;

  const sortedReport = [...trends].sort((a, b) => {
    if (reportSort === 'spend') return b.total_spend - a.total_spend;
    if (reportSort === 'repairs') return b.repair_count - a.repair_count;
    return a.month.localeCompare(b.month);
  });

  // ─── Loading / Error ───────────────────────────────────────────────────────
  if (loading) return (
    <div className="dashboard-page animate-fade-in">
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

  if (error) return (
    <div className="dashboard-page animate-fade-in">
      <PageHeader title="Fleet Analytics" subtitle="Dashboard" icon={BarChart2} />
      <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', padding: 48 }}>
        <AlertTriangle size={36} color="#f59e0b" />
        <div style={{ fontWeight: 700, color: 'var(--text)' }}>Analytics Service Unavailable</div>
        <div style={{ color: 'var(--muted)', fontSize: '0.875rem', textAlign: 'center' }}>{error}</div>
        <button className="btn-primary" onClick={fetchAll} style={{ marginTop: 8 }}>Retry</button>
      </div>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  const tabs = [
    { key: 'overview', label: 'Fleet Overview', icon: BarChart2 },
    { key: 'vehicles', label: 'Vehicle & Costs', icon: Car },
    { key: 'ai', label: 'AI Insights', icon: Zap },
    { key: 'reports', label: 'Reports', icon: FileText },
  ] as const;

  return (
    <div className="dashboard-page animate-fade-in">
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <PageHeader
          title="Fleet Analytics"
          subtitle="Vehicle Repair Management System — Analytics Dashboard"
          icon={BarChart2}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: '0.78rem' }}>
            <Clock size={13} />
            <span>Updated {lastUpdated}</span>
          </div>
          <button
            onClick={fetchAll}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Row ── */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          <KpiCard label="Total Repair Spend" value={fmt(summary.total_spend)} icon={PhilippinePeso} color="#8b5cf6" bg="rgba(139,92,246,0.1)" />
          <KpiCard label="Total Repairs" value={summary.total_repairs} icon={Wrench} color="#3b82f6" bg="rgba(59,130,246,0.1)" note={`${totalActiveTickets} currently active`} />
          <KpiCard label="Vehicles Tracked" value={summary.total_vehicles} icon={Car} color="#10b981" bg="rgba(16,185,129,0.1)" note={`${completionRate}% completion rate`} />
          <KpiCard label="Avg Cost / Repair" value={fmt(summary.avg_cost_per_repair)} icon={TrendingUp} color="#f59e0b" bg="rgba(245,158,11,0.1)" />
        </div>
      )}

      {/* ── Subtab Bar ── */}
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
                color: tab === t.key ? 'var(--accent)' : 'var(--muted)',
                borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* TAB 1 — Fleet Overview */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Row 1: Trend + Status Donut */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
            {/* Expense + Volume Trend */}
            <ChartCard title="Monthly Expense & Volume Trend" period={trendPeriod} onPeriodChange={setTrendPeriod}>
              {filteredTrends.length === 0
                ? <EmptyState label="No data for this period" />
                : (
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={filteredTrends} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--muted)', fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          itemStyle={tooltipItemStyle}
                          labelStyle={tooltipLabelStyle}
                          formatter={(val: any, name: any) => name === 'Spend' ? [fmt(Number(val)), 'Total Spend'] : [val, 'Repair Count']}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, color: 'var(--muted)', paddingTop: 8 }} />
                        <Area yAxisId="left" type="monotone" dataKey="total_spend" name="Spend" fill="url(#gradSpend)" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                        <Line yAxisId="right" type="monotone" dataKey="repair_count" name="Repairs" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </ChartCard>

            {/* Ticket Status Donut */}
            <ChartCard
              title="Ticket Status Distribution"
              extraRight={
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--muted)', cursor: 'pointer' }}
                >
                  <option value="ALL">All Statuses</option>
                  {statusBreakdown.map(s => <option key={s.status} value={s.status}>{STATUS_LABELS[s.status] || s.status}</option>)}
                </select>
              }
            >
              {filteredStatus.length === 0
                ? <EmptyState label="No ticket data" />
                : (
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={filteredStatus}
                          dataKey="count"
                          nameKey="status"
                          cx="40%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={88}
                          paddingAngle={4}
                          strokeWidth={0}
                        >
                          {filteredStatus.map((entry, i) => (
                            <Cell key={i} fill={STATUS_COLORS[entry.status] || PALETTE[i % PALETTE.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} formatter={(v, name) => [v, STATUS_LABELS[name as string] || name]} />
                        <Legend
                          layout="vertical"
                          align="right"
                          verticalAlign="middle"
                          wrapperStyle={{ fontSize: 12, color: 'var(--text)', paddingLeft: 16 }}
                          formatter={(value) => STATUS_LABELS[value] || value}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </ChartCard>
          </div>

          {/* Row 2: Velocity + Aging */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Ticket Velocity */}
            <ChartCard title="Ticket Creation Velocity" period={velocityPeriod} onPeriodChange={setVelocityPeriod}>
              {filteredVelocity.length === 0
                ? <EmptyState label="No data for this period" />
                : (
                  <div style={{ height: 230 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={filteredVelocity} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradVelocity" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.7} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} formatter={(v: any) => [v, 'Tickets Created']} />
                        <Area type="monotone" dataKey="count" name="Tickets" stroke="#3b82f6" strokeWidth={2} fill="url(#gradVelocity)" dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </ChartCard>

            {/* Ticket Aging */}
            <ChartCard title="Open Ticket Aging Distribution">
              {aging.length === 0
                ? <EmptyState label="No open tickets" />
                : (
                  <div style={{ height: 230 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={aging} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="bucket" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} formatter={(v: any) => [v, 'Open Tickets']} />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {aging.map((entry, i) => {
                            const c = entry.bucket === '< 24h' ? '#10b981' : entry.bucket === '24-72h' ? '#f59e0b' : '#ef4444';
                            return <Cell key={i} fill={c} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              {/* Legend */}
              <div style={{ display: 'flex', gap: 16, marginTop: 10, justifyContent: 'center' }}>
                {[['< 24h', '#10b981', 'On Track'], ['24-72h', '#f59e0b', 'Delayed'], ['> 72h', '#ef4444', 'Overdue']].map(([label, color, note]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--muted)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: color as string }} />
                    <span>{label} — <strong style={{ color: color as string }}>{note}</strong></span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* Row 3: Garage Costs + Cumulative Spend */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <ChartCard title="Repair Spend by Garage">
              {garageCosts.length === 0
                ? <EmptyState label="No garage data" />
                : (
                  <div style={{ height: 230 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={garageCosts} layout="vertical" margin={{ top: 4, right: 30, left: 8, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradGarage" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="garage" tick={{ fill: 'var(--muted)', fontSize: 11 }} width={90} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} formatter={(v: any) => [fmt(Number(v)), 'Total Spend']} />
                        <Bar dataKey="total_spend" fill="url(#gradGarage)" radius={[0, 6, 6, 0]} label={{ position: 'right', fill: 'var(--muted)', fontSize: 10, formatter: (v: any) => `₱${(Number(v) / 1000).toFixed(0)}k` }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </ChartCard>

            <ChartCard title="Cumulative Repair Spend" period={trendPeriod} onPeriodChange={setTrendPeriod}>
              {filteredTrends.length === 0
                ? <EmptyState label="No data for this period" />
                : (
                  <div style={{ height: 230 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={filteredTrends} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradCumul" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} formatter={(v: any) => [fmt(Number(v)), 'Cumulative Spend']} />
                        <Area type="monotone" dataKey="cumulative_spend" name="Cumulative" stroke="#10b981" strokeWidth={2.5} fill="url(#gradCumul)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </ChartCard>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* TAB 2 — Vehicle & Cost Analytics */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {tab === 'vehicles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Top Issues Bar Chart */}
          <ChartCard
            title="Top Recurring Repair Issues"
            extraRight={
              <div style={{ display: 'flex', background: 'var(--surface-alt)', borderRadius: 8, padding: 2, gap: 1 }}>
                {(['top5', 'top10', 'ALL'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setIssuePeriod(p)}
                    style={{
                      padding: '3px 9px', borderRadius: 6, border: 'none', fontSize: '0.72rem',
                      fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                      background: issuePeriod === p ? 'var(--accent)' : 'transparent',
                      color: issuePeriod === p ? '#fff' : 'var(--muted)',
                    }}
                  >{p === 'top5' ? 'Top 5' : p === 'top10' ? 'Top 10' : 'All'}</button>
                ))}
              </div>
            }
          >
            {filteredIssues.length === 0
              ? <EmptyState label="No issue frequency data" />
              : (
                <div style={{ maxHeight: 340, overflowY: 'auto', paddingRight: 6 }}>
                  <div style={{ height: Math.max(220, filteredIssues.length * 38), minWidth: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={filteredIssues} layout="vertical" margin={{ top: 24, right: 48, left: 16, bottom: 8 }}>
                        <defs>
                          <linearGradient id="gradIssueBar" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.95} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" orientation="top" tick={{ fill: 'var(--muted)', fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
                        <YAxis
                          type="category"
                          dataKey="description"
                          tick={{ fill: 'var(--text)', fontSize: 11, fontWeight: 500 }}
                          tickFormatter={(v: string) => {
                            const cleaned = cleanIssueLabel(v);
                            return cleaned.length > 30 ? `${cleaned.substring(0, 30)}…` : cleaned;
                          }}
                          width={220}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          itemStyle={tooltipItemStyle}
                          labelStyle={tooltipLabelStyle}
                          formatter={(v: any) => [v, 'Occurrences']}
                          labelFormatter={(label: any) => cleanIssueLabel(String(label || ''))}
                        />
                        <Bar
                          dataKey="occurrence_count"
                          name="Occurrences"
                          fill="url(#gradIssueBar)"
                          radius={[0, 6, 6, 0]}
                          barSize={18}
                          label={{ position: 'right', fill: 'var(--muted)', fontSize: 11, fontWeight: 700 }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
          </ChartCard>

          {/* Vehicle Cost Bar Chart */}
          <ChartCard
            title="Repair Spend by Vehicle"
            extraRight={
              <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 8, padding: 2, gap: 1 }}>
                {(['ALL', 'top5', 'top10'] as const).map(p => (
                  <button key={p} onClick={() => setVehPeriod(p)}
                    style={{
                      padding: '3px 9px', borderRadius: 6, border: 'none', fontSize: '0.72rem',
                      fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                      background: vehPeriod === p ? 'var(--accent)' : 'transparent',
                      color: vehPeriod === p ? '#fff' : 'var(--muted)',
                    }}
                  >{p === 'ALL' ? 'All' : p === 'top5' ? 'Top 5' : 'Top 10'}</button>
                ))}
              </div>
            }
          >
            {filteredVehicles.length === 0
              ? <EmptyState label="No vehicle data" />
              : (
                <div style={{ maxHeight: 340, overflowY: 'auto', paddingRight: 6 }}>
                  <div style={{ height: Math.max(200, filteredVehicles.length * 36), minWidth: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={filteredVehicles} layout="vertical" margin={{ top: 24, right: 60, left: 8, bottom: 8 }}>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" orientation="top" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="vehicle_plate" tick={{ fill: 'var(--muted)', fontSize: 11 }} width={80} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} formatter={(v: any) => [fmt(Number(v)), 'Total Spend']} labelFormatter={(l: any) => `Plate: ${l}`} />
                        <Bar dataKey="total_parts_cost" name="Parts Cost" fill="#8b5cf6" radius={[0, 6, 6, 0]}
                          label={{ position: 'right', fill: 'var(--muted)', fontSize: 10, formatter: (v: any) => `₱${(Number(v) / 1000).toFixed(1)}k` }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
          </ChartCard>

          {/* Vehicle Reliability Table */}
          <div className="premium-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>Vehicle Reliability Scorecard</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{vehicles.length} vehicles tracked</span>
            </div>
            {vehicles.length === 0
              ? <EmptyState label="No vehicle data" />
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Plate No.', 'Model', 'Total Repairs', 'Parts Cost', 'Avg Cost/Repair', 'Last Repair', 'Risk Level'].map(h => (
                          <th key={h} style={{ padding: '9px 12px', textAlign: 'left', color: 'var(--muted)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.map((v, i) => {
                        const risk = getRisk(v.total_repairs);
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace', letterSpacing: '0.03em' }}>{v.vehicle_plate}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{v.vehicle_model || '—'}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{v.total_repairs}</span>
                                <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 4, maxWidth: 60 }}>
                                  <div style={{ height: '100%', borderRadius: 4, background: risk.color, width: `${Math.min(100, (v.total_repairs / 15) * 100)}%` }} />
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{fmt(v.total_parts_cost)}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{fmt(v.avg_repair_cost)}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '0.8rem' }}>{v.latest_repair_date ? new Date(v.latest_repair_date).toLocaleDateString('en-PH') : '—'}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ background: risk.bg, color: risk.color, padding: '3px 9px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                                {risk.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* TAB 3 — AI Insights */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {tab === 'ai' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* AI KPI Row */}
          {(() => {
            const s = aiStats?.satisfaction;
            const totalFb = Number(s?.total_feedback || 0);
            const helpful = Number(s?.helpful_count || 0);
            const satRate = totalFb > 0 ? (s?.satisfaction_rate ?? Math.round((helpful / totalFb) * 100)) : null;
            const avgRating = Number(s?.avg_rating || 0);

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                <KpiCard label="Total AI Diagnoses" value={aiStats?.total_interactions ?? 0} icon={Zap} color="#8b5cf6" bg="rgba(139,92,246,0.1)" />
                <KpiCard label="Satisfaction Rate" value={satRate != null ? `${satRate}%` : 'N/A'} icon={ThumbsUp} color="#10b981" bg="rgba(16,185,129,0.1)" note={totalFb > 0 ? `Based on ${totalFb} mechanic ratings` : 'No ratings yet'} />
                <KpiCard label="Avg Rating" value={avgRating > 0 ? `${avgRating.toFixed(1)} / 5` : 'N/A'} icon={Activity} color="#3b82f6" bg="rgba(59,130,246,0.1)" />
                <KpiCard label="Feedback Received" value={totalFb} icon={Shield} color="#f59e0b" bg="rgba(245,158,11,0.1)" />
              </div>
            );
          })()}

          {/* Model Usage + Satisfaction */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Model Telemetry */}
            <ChartCard title="AI Model Usage Distribution">
              {!aiStats || Object.keys(aiStats.models_used || {}).length === 0
                ? <EmptyState label="No AI interaction data yet" />
                : (() => {
                  const modelData = Object.entries(aiStats.models_used).map(([model, count]) => {
                    let displayName = model;
                    if (model.includes('2.0-flash (AI Engine)')) displayName = 'Gemini 2.0 Flash';
                    else if (model.includes('1.5-flash')) displayName = 'Gemini 1.5 Flash';
                    else if (model.includes('Local Fallback') || model === 'dynamic_fallback') displayName = 'Local Fallback';
                    else if (model === 'mock') displayName = 'Offline Engine';
                    return { name: displayName, value: count };
                  });

                  const colors = ['#8b5cf6', '#3b82f6', '#f59e0b', '#10b981', '#ec4899'];

                  return (
                    <div style={{ height: 240 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={modelData} dataKey="value" nameKey="name" cx="40%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} strokeWidth={0}>
                            {modelData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} formatter={(v: any, name: any) => [v, name]} />
                          <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 12, color: 'var(--text)', paddingLeft: 16 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
            </ChartCard>

            {/* Feedback Summary */}
            <ChartCard title="Mechanic Feedback Summary">
              {(() => {
                const s = aiStats?.satisfaction;
                const totalFb = Number(s?.total_feedback || 0);
                const helpful = Number(s?.helpful_count || 0);
                const notHelpful = totalFb > helpful ? totalFb - helpful : 0;
                const satRate = totalFb > 0 ? (s?.satisfaction_rate ?? Math.round((helpful / totalFb) * 100)) : 100;
                const avgRating = Number(s?.avg_rating || 5);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 4 }}>
                    {/* Thumbs stats */}
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div style={{ flex: 1, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <ThumbsUp size={22} color="#10b981" />
                        </div>
                        <div>
                          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10b981', lineHeight: 1 }}>{helpful}</div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', marginTop: 4 }}>Helpful Feedback</div>
                        </div>
                      </div>

                      <div style={{ flex: 1, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <ThumbsDown size={22} color="#ef4444" />
                        </div>
                        <div>
                          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ef4444', lineHeight: 1 }}>{notHelpful}</div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', marginTop: 4 }}>Not Helpful</div>
                        </div>
                      </div>
                    </div>

                    {/* Satisfaction Bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.82rem', color: 'var(--muted)' }}>
                        <span style={{ fontWeight: 600 }}>Mechanic Satisfaction</span>
                        <span style={{ fontWeight: 800, color: satRate >= 80 ? '#10b981' : satRate >= 50 ? '#f59e0b' : '#ef4444' }}>
                          {totalFb > 0 ? `${satRate}%` : 'No ratings yet'}
                        </span>
                      </div>
                      <div style={{ height: 8, background: 'var(--surface-alt)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #10b981, #3b82f6)', width: `${totalFb > 0 ? satRate : 0}%`, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>

                    {/* Avg Rating */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-alt)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--muted)', fontWeight: 600 }}>Overall Quality Score</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 3 }}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <span key={star} style={{ fontSize: '1.1rem', color: star <= Math.round(avgRating) ? '#f59e0b' : 'var(--border)' }}>★</span>
                          ))}
                        </div>
                        <span style={{ fontWeight: 900, color: 'var(--text)', fontSize: '0.95rem' }}>{avgRating > 0 ? avgRating.toFixed(1) : '5.0'} / 5</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </ChartCard>
          </div>

          {/* Top Issues (AI context) */}
          <ChartCard title="Top Recurring Repair Issues (AI Knowledge Base)">
            {issueFreq.length === 0
              ? <EmptyState label="No issue frequency data" />
              : (
                <div style={{ maxHeight: 340, overflowY: 'auto', paddingRight: 6 }}>
                  <div style={{ height: Math.max(220, Math.min(8, issueFreq.length) * 38), minWidth: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={issueFreq.slice(0, 8)} layout="vertical" margin={{ top: 24, right: 48, left: 16, bottom: 8 }}>
                        <defs>
                          <linearGradient id="gradAiIssueBar" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.95} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" orientation="top" tick={{ fill: 'var(--muted)', fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
                        <YAxis
                          type="category"
                          dataKey="description"
                          tick={{ fill: 'var(--text)', fontSize: 11, fontWeight: 500 }}
                          tickFormatter={(v: string) => {
                            const cleaned = cleanIssueLabel(v);
                            return cleaned.length > 30 ? `${cleaned.substring(0, 30)}…` : cleaned;
                          }}
                          width={220}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          itemStyle={tooltipItemStyle}
                          labelStyle={tooltipLabelStyle}
                          formatter={(v: any) => [v, 'Occurrences']}
                          labelFormatter={(label: any) => cleanIssueLabel(String(label || ''))}
                        />
                        <Bar
                          dataKey="occurrence_count"
                          name="Occurrences"
                          fill="url(#gradAiIssueBar)"
                          radius={[0, 6, 6, 0]}
                          barSize={18}
                          label={{ position: 'right', fill: 'var(--muted)', fontSize: 11, fontWeight: 700 }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
          </ChartCard>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* TAB 4 — Reports */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {tab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="premium-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>Monthly Repair Cost Report</span>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>
                  {selectedMonths.length > 0
                    ? <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{selectedMonths.length} of {sortedReport.length} months selected for export</span>
                    : 'Select specific months below or export the entire report'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {/* Sort buttons */}
                <div style={{ display: 'flex', background: 'var(--surface-alt)', borderRadius: 8, padding: 2, gap: 1 }}>
                  {(['month', 'spend', 'repairs'] as const).map(s => (
                    <button key={s} onClick={() => setReportSort(s)}
                      style={{
                        padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: '0.75rem',
                        fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                        background: reportSort === s ? 'var(--accent)' : 'transparent',
                        color: reportSort === s ? '#fff' : 'var(--muted)',
                      }}
                    >{s === 'month' ? 'By Month' : s === 'spend' ? 'By Spend' : 'By Volume'}</button>
                  ))}
                </div>

                {/* Selection helper */}
                {selectedMonths.length > 0 && (
                  <button
                    onClick={() => setSelectedMonths([])}
                    style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Clear ({selectedMonths.length})
                  </button>
                )}

                {/* CSV Export */}
                <button
                  onClick={() => {
                    const rowsToExport = selectedMonths.length > 0
                      ? sortedReport.filter(r => selectedMonths.includes(r.month))
                      : sortedReport;
                    const rows = [
                      ['Month', 'Repair Count', 'Total Spend (PHP)', 'Avg Cost Per Repair (PHP)', 'Cumulative Spend (PHP)'],
                      ...rowsToExport.map(r => [r.month, r.repair_count, r.total_spend, (r.repair_count > 0 ? (r.total_spend / r.repair_count).toFixed(2) : 0), r.cumulative_spend]),
                    ];
                    const csv = rows.map(r => r.join(',')).join('\n');
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                    a.download = `vrms_monthly_report_${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(232,184,0,0.25)' }}
                >
                  <Download size={14} />
                  {selectedMonths.length > 0 ? `Export Selected (${selectedMonths.length})` : 'Export All CSV'}
                </button>
              </div>
            </div>

            {trends.length === 0
              ? <EmptyState label="No monthly data available" />
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)' }}>
                        <th style={{ padding: '9px 12px', width: 36, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={sortedReport.length > 0 && selectedMonths.length === sortedReport.length}
                            onChange={() => {
                              if (selectedMonths.length === sortedReport.length) setSelectedMonths([]);
                              else setSelectedMonths(sortedReport.map(r => r.month));
                            }}
                            style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                            title="Select all rows"
                          />
                        </th>
                        {['Month', 'Repair Count', 'Total Spend', 'Avg / Repair', 'Cumulative Spend', 'Spend %'].map(h => (
                          <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: 'var(--muted)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedReport.map((row, i) => {
                        const isSelected = selectedMonths.includes(row.month);
                        const totalSpendAll = trends.reduce((a, b) => a + b.total_spend, 0);
                        const pct = totalSpendAll > 0 ? ((row.total_spend / totalSpendAll) * 100).toFixed(1) : '0';
                        const avg = row.repair_count > 0 ? row.total_spend / row.repair_count : 0;
                        return (
                          <tr
                            key={i}
                            style={{
                              borderBottom: '1px solid var(--border)',
                              background: isSelected ? 'rgba(232,184,0,0.08)' : 'transparent',
                              transition: 'background 0.12s',
                            }}
                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface-alt)'; }}
                            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                          >
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setSelectedMonths((prev: string[]) =>
                                    prev.includes(row.month) ? prev.filter((m: string) => m !== row.month) : [...prev, row.month]
                                  );
                                }}
                                style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                              />
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text)' }}>{row.month}</td>
                            <td style={{ padding: '10px 14px', color: 'var(--text)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {row.repair_count}
                                <div style={{ height: 4, width: 40, background: 'var(--border)', borderRadius: 4 }}>
                                  <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 4, width: `${Math.min(100, (row.repair_count / Math.max(...trends.map(t => t.repair_count))) * 100)}%` }} />
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '10px 14px', color: 'var(--text)', fontWeight: 600 }}>{fmt(row.total_spend)}</td>
                            <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{fmt(avg)}</td>
                            <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{fmt(row.cumulative_spend)}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ height: 6, width: 60, background: 'var(--border)', borderRadius: 4 }}>
                                  <div style={{ height: '100%', background: '#8b5cf6', borderRadius: 4, width: `${pct}%` }} />
                                </div>
                                <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--surface-alt)' }}>
                        <td style={{ padding: '10px 12px' }} />
                        <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--text)', fontSize: '0.8rem' }}>TOTAL</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text)' }}>{trends.reduce((a, b) => a + b.repair_count, 0)}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--accent)' }}>{fmt(trends.reduce((a, b) => a + b.total_spend, 0))}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>
                          {fmt(trends.reduce((a, b) => a + b.total_spend, 0) / Math.max(1, trends.reduce((a, b) => a + b.repair_count, 0)))}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
          </div>

          {/* Summary Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { label: 'Highest Spend Month', value: trends.length ? trends.reduce((a, b) => a.total_spend > b.total_spend ? a : b).month : '—', icon: ArrowUpRight, color: '#ef4444' },
              { label: 'Lowest Spend Month', value: trends.length ? trends.reduce((a, b) => a.total_spend < b.total_spend ? a : b).month : '—', icon: ArrowDownRight, color: '#10b981' },
              { label: 'Avg Monthly Repairs', value: trends.length ? Math.round(trends.reduce((a, b) => a + b.repair_count, 0) / trends.length) : 0, icon: FileText, color: '#3b82f6' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="premium-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Empty State Helper ───────────────────────────────────────────────────────
function EmptyState({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--muted)', fontSize: '0.875rem', flexDirection: 'column', gap: 8 }}>
      <ChevronDown size={24} strokeWidth={1.5} />
      {label}
    </div>
  );
}
