import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, FileText, Download } from 'lucide-react';
import type { AnalyticsData } from '../hooks/useAnalyticsData';
import { EmptyState, PillToggle } from './ChartPrimitives';
import { downloadMasterCsv, downloadMasterPdf } from '../export';
import { fmt, tint } from '../utils';

const SORT_OPTIONS = ['month', 'spend', 'repairs'] as const;
type ReportSort = typeof SORT_OPTIONS[number];
const SORT_LABELS: Record<ReportSort, string> = { month: 'By Month', spend: 'By Spend', repairs: 'By Volume' };
const REPORT_HEADERS = ['Month', 'Repair Count', 'Total Spend', 'Avg / Repair', 'Cumulative Spend', 'Spend %'];

export function ReportsTab({ summary, trends, vehicles, garageCosts, issueFreq, aiStats }: AnalyticsData) {
  const [reportSort, setReportSort] = useState<ReportSort>('month');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  const sortedReport = [...trends].sort((a, b) => {
    if (reportSort === 'spend') return b.total_spend - a.total_spend;
    if (reportSort === 'repairs') return b.repair_count - a.repair_count;
    return b.month.localeCompare(a.month);
  });

  const totalSpendAll = trends.reduce((a, b) => a + b.total_spend, 0);
  const totalRepairsAll = trends.reduce((a, b) => a + b.repair_count, 0);
  const maxRepairs = Math.max(...trends.map(t => t.repair_count));
  const exportData = { summary, trends, reportRows: sortedReport, vehicles, garageCosts, issueFreq, aiStats };

  const quickStats = [
    { label: 'Highest Spend Month', value: trends.length ? trends.reduce((a, b) => a.total_spend > b.total_spend ? a : b).month : '—', icon: ArrowUpRight, color: 'var(--danger)' },
    { label: 'Lowest Spend Month', value: trends.length ? trends.reduce((a, b) => a.total_spend < b.total_spend ? a : b).month : '—', icon: ArrowDownRight, color: 'var(--success)' },
    { label: 'Avg Monthly Repairs', value: trends.length ? Math.round(totalRepairsAll / trends.length) : 0, icon: FileText, color: 'var(--primary)' },
  ];

  const toggleMonth = (month: string) => {
    setSelectedMonths(prev => prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]);
  };

  return (
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
            <PillToggle options={SORT_OPTIONS} value={reportSort} onChange={setReportSort} labels={SORT_LABELS} size="md" />

            {selectedMonths.length > 0 && (
              <button
                onClick={() => setSelectedMonths([])}
                style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Clear ({selectedMonths.length})
              </button>
            )}

            <button
              onClick={() => downloadMasterCsv(exportData)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', boxShadow: `0 2px 8px ${tint('var(--accent)', 25)}` }}
            >
              <Download size={14} />
              {selectedMonths.length > 0 ? `Export Selected CSV (${selectedMonths.length})` : 'Export Master CSV'}
            </button>

            <button
              type="button"
              onClick={() => downloadMasterPdf(exportData)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
            >
              <FileText size={14} color="var(--danger)" />
              Export Master PDF Report
            </button>
          </div>
        </div>

        {trends.length === 0
          ? <EmptyState label="No monthly data available" />
          : (
            <div style={{ overflowX: 'auto', maxHeight: '380px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
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
                    {REPORT_HEADERS.map(h => (
                      <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: 'var(--muted)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedReport.map((row, i) => {
                    const isSelected = selectedMonths.includes(row.month);
                    const pct = totalSpendAll > 0 ? ((row.total_spend / totalSpendAll) * 100).toFixed(1) : '0';
                    const avg = row.repair_count > 0 ? row.total_spend / row.repair_count : 0;
                    return (
                      <tr
                        key={i}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: isSelected ? 'var(--accent-soft)' : 'transparent',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface-alt)'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleMonth(row.month)}
                            style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                          />
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text)' }}>{row.month}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {row.repair_count}
                            <div style={{ height: 4, width: 40, background: 'var(--border)', borderRadius: 4 }}>
                              <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 4, width: `${Math.min(100, (row.repair_count / maxRepairs) * 100)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text)', fontWeight: 600 }}>{fmt(row.total_spend)}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{fmt(avg)}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{fmt(row.cumulative_spend)}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ height: 6, width: 60, background: 'var(--border)', borderRadius: 4 }}>
                              <div style={{ height: '100%', background: 'var(--primary)', borderRadius: 4, width: `${pct}%` }} />
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
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text)' }}>{totalRepairsAll}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--accent)' }}>{fmt(totalSpendAll)}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{fmt(totalSpendAll / Math.max(1, totalRepairsAll))}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {quickStats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="premium-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: tint(color, 9), color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
  );
}
