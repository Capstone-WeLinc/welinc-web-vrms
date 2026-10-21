import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { AnalyticsData } from '../hooks/useAnalyticsData';
import { ChartCard, EmptyState, PillToggle } from './ChartPrimitives';
import { IssueFrequencyChart } from './IssueFrequencyChart';
import {
  TOP_N_LABELS, TOP_N_OPTIONS, axisTick, chartTooltipProps, fmt, fmtThousands, getRisk, takeTopN,
} from '../utils';
import type { TopN } from '../utils';

const SCORECARD_HEADERS = ['Plate No.', 'Model', 'Total Repairs', 'Parts Cost', 'Avg Cost/Repair', 'Last Repair', 'Risk Level'];

export function VehiclesTab({ vehicles, issueFreq }: AnalyticsData) {
  const [vehPeriod, setVehPeriod] = useState<TopN>('top5');
  const [issuePeriod, setIssuePeriod] = useState<TopN>('top5');

  const filteredVehicles = takeTopN(vehicles, vehPeriod);
  const filteredIssues = takeTopN(issueFreq, issuePeriod);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

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
                    {SCORECARD_HEADERS.map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', color: 'var(--muted)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v, i) => {
                    const risk = getRisk(v.total_repairs);
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-alt)')}
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard
          title="Top Recurring Repair Issues"
          extraRight={<PillToggle options={TOP_N_OPTIONS} value={issuePeriod} onChange={setIssuePeriod} labels={TOP_N_LABELS} />}
        >
          {filteredIssues.length === 0
            ? <EmptyState label="No issue frequency data" />
            : <IssueFrequencyChart data={filteredIssues} gradientId="gradIssueBar" />}
        </ChartCard>

        <ChartCard
          title="Repair Spend by Vehicle"
          extraRight={<PillToggle options={TOP_N_OPTIONS} value={vehPeriod} onChange={setVehPeriod} labels={TOP_N_LABELS} />}
        >
          {filteredVehicles.length === 0
            ? <EmptyState label="No vehicle data" />
            : (
              <div style={{ maxHeight: 340, overflowY: 'auto', paddingRight: 6 }}>
                <div style={{ height: Math.max(200, filteredVehicles.length * 36), minWidth: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredVehicles} layout="vertical" margin={{ top: 24, right: 60, left: 8, bottom: 8 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" orientation="top" tick={axisTick} tickFormatter={v => fmtThousands(v)} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="vehicle_plate" tick={axisTick} width={80} axisLine={false} tickLine={false} />
                      <Tooltip {...chartTooltipProps} formatter={(v) => [fmt(Number(v)), 'Total Spend']} labelFormatter={(l) => `Plate: ${l}`} />
                      <Bar dataKey="total_parts_cost" name="Parts Cost" fill="var(--primary)" radius={[0, 6, 6, 0]}
                        label={{ position: 'right', fill: 'var(--muted)', fontSize: 10, formatter: (v: unknown) => fmtThousands(v, 1) }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
        </ChartCard>
      </div>
    </div>
  );
}
