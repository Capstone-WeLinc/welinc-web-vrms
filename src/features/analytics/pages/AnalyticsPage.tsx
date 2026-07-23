import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Wrench, Car, PhilippinePeso, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LinearGradient
} from 'recharts';

const API_BASE = (import.meta.env as any).VITE_API_BASE_URL || 'http://localhost:3000';

interface CostTrend { month: string; repair_count: number; total_spend: number; cumulative_spend: number; }
interface VehicleKpi { vehicle_plate: string; vehicle_model: string; total_repairs: number; total_parts_cost: number; avg_repair_cost: number; }
interface Summary { total_spend: number; total_repairs: number; total_vehicles: number; avg_cost_per_repair: number; }
interface StatusBreakdown { status: string; count: number; }
interface GarageCost { garage: string; repair_count: number; total_spend: number; }
interface Aging { bucket: string; count: number; }
interface Velocity { date: string; count: number; }

function getRiskLevel(total_repairs: number) {
  if (total_repairs >= 10) return { label: 'HIGH RISK', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
  if (total_repairs >= 5)  return { label: 'MEDIUM RISK', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
  return { label: 'LOW RISK', color: '#10b981', bg: 'rgba(16,185,129,0.1)' };
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#10b981',
  IN_PROGRESS: '#3b82f6',
  PENDING: '#f59e0b',
  CANCELLED: '#6b7280',
  FOR_VERIFICATION: '#8b5cf6'
};

const AGING_COLORS: Record<string, string> = {
  '< 24h': '#10b981',
  '24-72h': '#f59e0b',
  '> 72h': '#ef4444'
};

export function AnalyticsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trends, setTrends] = useState<CostTrend[]>([]);
  const [vehicles, setVehicles] = useState<VehicleKpi[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([]);
  const [garageCosts, setGarageCosts] = useState<GarageCost[]>([]);
  const [aging, setAging] = useState<Aging[]>([]);
  const [velocity, setVelocity] = useState<Velocity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('ALL');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [sumRes, trendRes, vehRes, statusRes, garageRes, agingRes, velocityRes] = await Promise.all([
          fetch(`${API_BASE}/analytics/summary`),
          fetch(`${API_BASE}/analytics/cost-trends`),
          fetch(`${API_BASE}/analytics/vehicle-kpis`),
          fetch(`${API_BASE}/analytics/status-breakdown`),
          fetch(`${API_BASE}/analytics/garage-costs`),
          fetch(`${API_BASE}/analytics/aging`),
          fetch(`${API_BASE}/analytics/velocity`)
        ]);
        const [sumData, trendData, vehData, statusData, garageData, agingData, velocityData] = await Promise.all([
          sumRes.json(), trendRes.json(), vehRes.json(), statusRes.json(), garageRes.json(), agingRes.json(), velocityRes.json()
        ]);
        
        setSummary(sumData);
        setTrends(trendData.data || []);
        setVehicles(vehData.data || []);
        setStatusBreakdown(statusData.data || []);
        setGarageCosts(garageData.data || []);
        setAging(agingData.data || []);
        setVelocity(velocityData.data || []);
      } catch (e: any) {
        setError('Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const tooltipStyle = { background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' };

  // Filter velocity data by period
  const filteredVelocity = velocity.filter(d => {
    if (period === 'ALL') return true;
    const [mon, yr] = d.date.split(' ');
    const now = new Date();
    const dataDate = new Date(`${mon} 1, ${yr}`);
    if (period === 'MONTHLY') return dataDate.getMonth() === now.getMonth() && dataDate.getFullYear() === now.getFullYear();
    if (period === 'YEARLY') return dataDate.getFullYear() === now.getFullYear();
    return true; // DAILY — no daily breakdown, show all
  });

  const filteredTrends = trends.filter(t => {
    if (period === 'ALL') return true;
    const [yr, mon] = t.month.split('-');
    const now = new Date();
    if (period === 'MONTHLY') return parseInt(mon) === now.getMonth() + 1 && parseInt(yr) === now.getFullYear();
    if (period === 'YEARLY') return parseInt(yr) === now.getFullYear();
    return true;
  });

  const currencyFormatter = (val: number) => `₱${Number(val).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;

  return (
    <div className="dashboard-page animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <PageHeader
          title="Repair Analytics"
          subtitle="Comprehensive fleet maintenance analytics, cost intelligence, and operational KPIs."
          icon={BarChart2}
        />
        <div style={{ display: 'flex', gap: 8, background: 'var(--surface)', padding: 4, borderRadius: 20 }}>
          {['DAILY', 'MONTHLY', 'YEARLY', 'ALL'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '6px 16px', borderRadius: 16, border: 'none', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                background: period === p ? 'var(--accent)' : 'transparent',
                color: period === p ? '#fff' : 'var(--muted)',
                transition: 'all 0.2s'
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="premium-card" style={{ opacity: 0.5, animation: 'pulse 2s infinite' }}>
          <p>Loading analytics data...</p>
        </div>
      ) : error ? (
        <div className="premium-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#f59e0b' }}>
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          
          {/* Top KPI row */}
          {summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
              {[
                { label: 'Total Repair Spend', value: `₱${(summary.total_spend || 0).toLocaleString()}`, icon: PhilippinePeso, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
                { label: 'Total Repairs', value: (summary.total_repairs || 0).toLocaleString(), icon: Wrench, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
                { label: 'Vehicles Tracked', value: (summary.total_vehicles || 0).toLocaleString(), icon: Car, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                { label: 'Avg Cost / Repair', value: `₱${(summary.avg_cost_per_repair || 0).toLocaleString()}`, icon: TrendingUp, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="premium-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color, flexShrink: 0 }}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Left: Ticket Creation Velocity */}
            <div className="premium-card">
              <h3 className="subheading" style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 800 }}>Ticket Creation Velocity</h3>
              {filteredVelocity.length === 0 ? <p style={{ color: 'var(--muted)' }}>No data for selected period</p> : (
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredVelocity}>
                      <defs>
                        <linearGradient id="colorVelocity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => [val, 'Tickets']} />
                      <Area type="monotone" dataKey="count" name="Tickets" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorVelocity)" activeDot={{ r: 6 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Right: Status Distribution */}
            <div className="premium-card">
              <h3 className="subheading" style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 800 }}>Ticket Status Distribution</h3>
              {statusBreakdown.length === 0 ? <p style={{ color: 'var(--muted)' }}>Data unavailable</p> : (
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                      >
                        {statusBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#cbd5e1'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12, color: 'var(--text)' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Row 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Left: Repair Cost by Garage */}
            <div className="premium-card">
              <h3 className="subheading" style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 800 }}>Total Repair Spend by Garage</h3>
              {garageCosts.length === 0 ? <p style={{ color: 'var(--muted)' }}>Data unavailable</p> : (
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={garageCosts} layout="vertical" margin={{ left: 20 }}>
                      <defs>
                        <linearGradient id="colorGarage" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={(v) => `₱${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="garage" tick={{ fill: 'var(--muted)', fontSize: 11 }} width={80} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(val: number) => [currencyFormatter(val), 'Total Spend']}
                        labelFormatter={(label) => `Garage: ${label}`}
                      />
                      <Bar dataKey="total_spend" name="Total Spend" fill="url(#colorGarage)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Right: Monthly Expense Trend */}
            <div className="premium-card">
              <h3 className="subheading" style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 800 }}>Monthly Expense & Volume Trend</h3>
              {filteredTrends.length === 0 ? <p style={{ color: 'var(--muted)' }}>No data for selected period</p> : (
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={filteredTrends}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={(v) => `₱${(v/1000).toFixed(0)}k`} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--muted)', fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(val: number, name: string) =>
                          name === 'Total Spend (₱)'
                            ? [currencyFormatter(val), 'Total Spend']
                            : [val, 'Repair Count']
                        }
                      />
                      <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text)' }}/>
                      <Bar yAxisId="left" dataKey="total_spend" fill="#8b5cf6" name="Total Spend (₱)" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="repair_count" stroke="#f59e0b" name="Repair Count" strokeWidth={2} dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Row 3 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Left: Open Ticket Aging Distribution */}
            <div className="premium-card">
              <h3 className="subheading" style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 800 }}>Open Ticket Aging Distribution</h3>
              {aging.length === 0 ? <p style={{ color: 'var(--muted)' }}>Data unavailable</p> : (
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={aging}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="bucket" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {aging.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={AGING_COLORS[entry.bucket] || '#cbd5e1'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Right: Vehicle Reliability KPI */}
            <div className="premium-card">
              <h3 className="subheading" style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 800 }}>Vehicle Reliability KPIs</h3>
              {vehicles.length === 0 ? <p style={{ color: 'var(--muted)' }}>Data unavailable</p> : (
                <div style={{ overflowX: 'auto', height: 250 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Plate', 'Repairs', 'Avg Cost', 'Risk'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--muted)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.slice(0, 5).map(v => {
                        const repairsCount = Number(v.total_repairs) || 0;
                        const avgCost = Number(v.avg_repair_cost) || 0;
                        const risk = getRiskLevel(repairsCount);
                        return (
                          <tr key={v.vehicle_plate} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text)' }}>{v.vehicle_plate}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>{repairsCount}</span>
                                <div style={{ width: 40, height: 4 }}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={[{ val: repairsCount }]} layout="vertical">
                                      <XAxis type="number" hide domain={[0, 15]} />
                                      <YAxis type="category" hide />
                                      <Bar dataKey="val" fill="var(--accent)" radius={2} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '8px 12px', color: 'var(--muted)' }}>₱{avgCost.toLocaleString()}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{ background: risk.bg, color: risk.color, padding: '3px 8px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 800 }}>
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

        </div>
      )}
    </div>
  );
}
