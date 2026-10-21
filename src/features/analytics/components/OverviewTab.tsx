import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import type { AnalyticsData } from '../hooks/useAnalyticsData';
import { ChartCard, EmptyState } from './ChartPrimitives';
import {
  PALETTE, STATUS_COLORS, STATUS_LABELS, axisTick, chartTooltipProps, filterByPeriod, fmt, fmtThousands,
} from '../utils';

const AGING_LEGEND = [
  { bucket: '< 24h', color: 'var(--success)', note: 'On Track' },
  { bucket: '24-72h', color: 'var(--warning)', note: 'Delayed' },
  { bucket: '> 72h', color: 'var(--danger)', note: 'Overdue' },
];

function agingColor(bucket: string) {
  return AGING_LEGEND.find(a => a.bucket === bucket)?.color ?? 'var(--danger)';
}

export function OverviewTab({ trends, statusBreakdown, velocity, aging, garageCosts }: AnalyticsData) {
  const [trendPeriod, setTrendPeriod] = useState('ALL');
  const [velocityPeriod, setVelocityPeriod] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredTrends = filterByPeriod(trends, trendPeriod, 'month');
  const filteredVelocity = filterByPeriod(velocity, velocityPeriod, 'date');
  const filteredStatus = statusFilter === 'ALL' ? statusBreakdown : statusBreakdown.filter(s => s.status === statusFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Row 1: Trend + Status Donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        <ChartCard title="Monthly Expense & Volume Trend" period={trendPeriod} onPeriodChange={setTrendPeriod}>
          {filteredTrends.length === 0
            ? <EmptyState label="No data for this period" />
            : (
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={filteredTrends} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" tick={axisTick} tickFormatter={v => fmtThousands(v)} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={axisTick} allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip
                      {...chartTooltipProps}
                      formatter={(val, name) => name === 'Spend' ? [fmt(Number(val)), 'Total Spend'] : [val, 'Repair Count']}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--muted-foreground)', paddingTop: 8 }} />
                    <Area yAxisId="left" type="monotone" dataKey="total_spend" name="Spend" fill="url(#gradSpend)" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="repair_count" name="Repairs" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 4, fill: 'var(--chart-2)', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
        </ChartCard>

        <ChartCard
          title="Ticket Status Distribution"
          extraRight={
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--muted-foreground)', cursor: 'pointer' }}
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
                    <Tooltip {...chartTooltipProps} formatter={(v, name) => [v, STATUS_LABELS[name as string] || name]} />
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
        <ChartCard title="Ticket Creation Velocity" period={velocityPeriod} onPeriodChange={setVelocityPeriod}>
          {filteredVelocity.length === 0
            ? <EmptyState label="No data for this period" />
            : (
              <div style={{ height: 230 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredVelocity} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradVelocity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.7} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={false} />
                    <YAxis tick={axisTick} allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip {...chartTooltipProps} formatter={(v) => [v, 'Tickets Created']} />
                    <Area type="monotone" dataKey="count" name="Tickets" stroke="var(--primary)" strokeWidth={2} fill="url(#gradVelocity)" dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
        </ChartCard>

        <ChartCard title="Open Ticket Aging Distribution">
          {aging.length === 0
            ? <EmptyState label="No open tickets" />
            : (
              <div style={{ height: 230 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aging} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="bucket" tick={axisTick} tickLine={false} axisLine={false} />
                    <YAxis tick={axisTick} allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip {...chartTooltipProps} formatter={(v) => [v, 'Open Tickets']} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {aging.map((entry, i) => <Cell key={i} fill={agingColor(entry.bucket)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          <div style={{ display: 'flex', gap: 16, marginTop: 10, justifyContent: 'center' }}>
            {AGING_LEGEND.map(({ bucket, color, note }) => (
              <div key={bucket} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                <span>{bucket} — <strong style={{ color }}>{note}</strong></span>
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
                        <stop offset="0%" stopColor="var(--primary)" />
                        <stop offset="100%" stopColor="var(--primary-strong)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={axisTick} tickFormatter={v => fmtThousands(v)} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="garage" tick={axisTick} width={90} axisLine={false} tickLine={false} />
                    <Tooltip {...chartTooltipProps} formatter={(v) => [fmt(Number(v)), 'Total Spend']} />
                    <Bar dataKey="total_spend" fill="url(#gradGarage)" radius={[0, 6, 6, 0]} label={{ position: 'right', fill: 'var(--muted-foreground)', fontSize: 10, formatter: (v: unknown) => fmtThousands(v) }} />
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
                        <stop offset="5%" stopColor="var(--success)" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="var(--success)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} />
                    <YAxis tick={axisTick} tickFormatter={v => fmtThousands(v)} axisLine={false} tickLine={false} />
                    <Tooltip {...chartTooltipProps} formatter={(v) => [fmt(Number(v)), 'Cumulative Spend']} />
                    <Area type="monotone" dataKey="cumulative_spend" name="Cumulative" stroke="var(--success)" strokeWidth={2.5} fill="url(#gradCumul)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
        </ChartCard>
      </div>
    </div>
  );
}
