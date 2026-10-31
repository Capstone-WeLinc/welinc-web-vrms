import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, FileText, Download } from 'lucide-react';
import type { AnalyticsData } from '../hooks/useAnalyticsData';
import { EmptyState, PillToggle, SectionGate } from './ChartPrimitives';
import { downloadMasterCsv, downloadMasterPdf } from '../export';
import { fmt, tint } from '../utils';

const SORT_OPTIONS = ['month', 'spend', 'repairs'] as const;
type ReportSort = typeof SORT_OPTIONS[number];
const SORT_LABELS: Record<ReportSort, string> = { month: 'By Month', spend: 'By Spend', repairs: 'By Volume' };
const REPORT_HEADERS = ['Month', 'Repair Count', 'Total Spend', 'Avg / Repair', 'Cumulative Spend', 'Spend %'];
const COUNT_HEADERS = ['Month', 'Repair Count'];
// With costs hidden, sorting by spend would leak it
const COUNT_SORT_OPTIONS = ['month', 'repairs'] as const;

export function ReportsTab({ summary, trends, vehicles, garageCosts, issueFreq, aiStats, aiOn, sections, retry, costsHidden, complete }: AnalyticsData) {
  const [reportSort, setReportSort] = useState<ReportSort>('month');
  const sort: ReportSort = costsHidden && reportSort === 'spend' ? 'month' : reportSort;
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  const sortedReport = [...trends].sort((a, b) => {
    if (sort === 'spend') return (b.total_spend ?? 0) - (a.total_spend ?? 0);
    if (sort === 'repairs') return b.repair_count - a.repair_count;
    return b.month.localeCompare(a.month);
  });

  const totalSpendAll = trends.reduce((a, b) => a + (b.total_spend ?? 0), 0);
  const totalRepairsAll = trends.reduce((a, b) => a + b.repair_count, 0);
  const maxRepairs = Math.max(...trends.map(t => t.repair_count));
  const exportData = { summary, trends, reportRows: sortedReport, vehicles, garageCosts, issueFreq, aiStats, aiOn, costsHidden };
  // Spec 0013, AC-6: never export while a section is loading or failed
  const exportBlocked = !complete;
  const exportTitle = exportBlocked ? 'Export is available once every section has loaded' : undefined;

  const quickStats = [
    ...(costsHidden ? [] : [
      { label: 'Highest Spend Month', value: trends.length ? trends.reduce((a, b) => (a.total_spend ?? 0) > (b.total_spend ?? 0) ? a : b).month : '—', icon: ArrowUpRight, color: 'var(--danger)' },
      { label: 'Lowest Spend Month', value: trends.length ? trends.reduce((a, b) => (a.total_spend ?? 0) < (b.total_spend ?? 0) ? a : b).month : '—', icon: ArrowDownRight, color: 'var(--success)' },
    ]),
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
            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>{costsHidden ? 'Monthly Repair Report' : 'Monthly Repair Cost Report'}</span>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', marginTop: 2 }}>
              {selectedMonths.length > 0
                ? <span style={{ color: 'var(--highlight)', fontWeight: 700 }}>{selectedMonths.length} of {sortedReport.length} months selected for export</span>
                : 'Select specific months below or export the entire report'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <PillToggle options={costsHidden ? COUNT_SORT_OPTIONS : SORT_OPTIONS} value={sort} onChange={setReportSort} labels={SORT_LABELS} size="md" />

            {selectedMonths.length > 0 && (
              <button
                onClick={() => setSelectedMonths([])}
                style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted-foreground)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Clear ({selectedMonths.length})
              </button>
            )}

            <button
              onClick={() => downloadMasterCsv(exportData)}
              disabled={exportBlocked}
              title={exportTitle}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--highlight)', color: 'var(--on-accent)', fontSize: '0.8rem', fontWeight: 700, cursor: exportBlocked ? 'not-allowed' : 'pointer', opacity: exportBlocked ? 0.5 : 1, boxShadow: `0 2px 8px ${tint('var(--highlight)', 25)}` }}
            >
              <Download size={14} />
              {selectedMonths.length > 0 ? `Export Selected CSV (${selectedMonths.length})` : 'Export Master CSV'}
            </button>

            <button
              type="button"
              onClick={() => downloadMasterPdf(exportData)}
              disabled={exportBlocked}
              title={exportTitle}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text)', fontSize: '0.8rem', fontWeight: 700, cursor: exportBlocked ? 'not-allowed' : 'pointer', opacity: exportBlocked ? 0.5 : 1 }}
            >
              <FileText size={14} color="var(--danger)" />
              Export Master PDF Report
            </button>
          </div>
        </div>

        <SectionGate state={sections.trends} onRetry={() => retry('trends')} height={240}>
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
                        style={{ cursor: 'pointer', accentColor: 'var(--highlight)' }}
                        title="Select all rows"
                      />
                    </th>
                    {(costsHidden ? COUNT_HEADERS : REPORT_HEADERS).map(h => (
                      <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedReport.map((row, i) => {
                    const isSelected = selectedMonths.includes(row.month);
                    const spend = row.total_spend ?? 0;
                    const pct = totalSpendAll > 0 ? ((spend / totalSpendAll) * 100).toFixed(1) : '0';
                    const avg = row.repair_count > 0 ? spend / row.repair_count : 0;
                    return (
                      <tr
                        key={i}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: isSelected ? 'color-mix(in srgb, var(--highlight) 10%, transparent)' : 'transparent',
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
                            style={{ cursor: 'pointer', accentColor: 'var(--highlight)' }}
                          />
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text)' }}>{row.month}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {row.repair_count}
                            <div style={{ height: 4, width: 40, background: 'var(--border)', borderRadius: 4 }}>
                              <div style={{ height: '100%', background: 'var(--highlight)', borderRadius: 4, width: `${Math.min(100, (row.repair_count / maxRepairs) * 100)}%` }} />
                            </div>
                          </div>
                        </td>
                        {!costsHidden && <>
                        <td style={{ padding: '10px 14px', color: 'var(--text)', fontWeight: 600 }}>{fmt(row.total_spend)}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--muted-foreground)' }}>{fmt(avg)}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--muted-foreground)' }}>{fmt(row.cumulative_spend)}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ height: 6, width: 60, background: 'var(--border)', borderRadius: 4 }}>
                              <div style={{ height: '100%', background: 'var(--primary)', borderRadius: 4, width: `${pct}%` }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{pct}%</span>
                          </div>
                        </td>
                        </>}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--surface-alt)' }}>
                    <td style={{ padding: '10px 12px' }} />
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--text)', fontSize: '0.8rem' }}>TOTAL</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text)' }}>{totalRepairsAll}</td>
                    {!costsHidden && <>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--highlight)' }}>{fmt(totalSpendAll)}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--muted-foreground)' }}>{fmt(totalSpendAll / Math.max(1, totalRepairsAll))}</td>
                    <td colSpan={2} />
                    </>}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </SectionGate>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${quickStats.length}, 1fr)`, gap: 14 }}>
        {quickStats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="premium-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: tint(color, 9), color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>{value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
