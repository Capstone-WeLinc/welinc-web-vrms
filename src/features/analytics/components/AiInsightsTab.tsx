import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Zap, ThumbsUp, ThumbsDown, Activity, Shield } from 'lucide-react';
import type { AnalyticsData } from '../hooks/useAnalyticsData';
import { ChartCard, EmptyState, KpiCard, SectionGate } from './ChartPrimitives';
import { IssueFrequencyChart } from './IssueFrequencyChart';
import { PALETTE, chartTooltipProps, getAiFeedbackStats, modelDisplayName, tint } from '../utils';

function FeedbackStat({ count, label, color, icon: Icon }: { count: number; label: string; color: string; icon: typeof ThumbsUp }) {
  return (
    <div style={{ flex: 1, background: tint(color, 8), border: `1px solid ${tint(color, 20)}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: tint(color, 15), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '1.8rem', fontWeight: 900, color, lineHeight: 1 }}>{count}</div>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted-foreground)', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

export function AiInsightsTab({ aiStats, issueFreq, sections, retry }: AnalyticsData) {
  const { totalFb, helpful, notHelpful, satRate, avgRating } = getAiFeedbackStats(aiStats);

  // Merge raw model ids that share a display name
  const deduped: Record<string, number> = {};
  Object.entries(aiStats?.models_used ?? {}).forEach(([model, count]) => {
    const name = modelDisplayName(model);
    deduped[name] = (deduped[name] || 0) + count;
  });
  const modelData = Object.entries(deduped).map(([name, value]) => ({ name, value }));

  const satColor = satRate >= 80 ? 'var(--success)' : satRate >= 50 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionGate state={sections.aiStats} onRetry={() => retry('aiStats')} height={300}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label="Total AI Diagnoses" value={aiStats?.total_interactions ?? 0} icon={Zap} color="var(--primary)" />
        <KpiCard label="Satisfaction Rate" value={`${satRate}%`} icon={ThumbsUp} color="var(--success)" note={`Based on ${totalFb} mechanic ratings`} />
        <KpiCard label="Avg Rating" value={`${avgRating.toFixed(1)} / 5`} icon={Activity} color="var(--primary)" />
        <KpiCard label="Feedback Received" value={totalFb} icon={Shield} color="var(--warning)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard title="AI Model Usage Distribution">
          {modelData.length === 0
            ? <EmptyState label="No AI interaction data yet" />
            : (
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={modelData} dataKey="value" nameKey="name" cx="40%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} strokeWidth={0}>
                      {modelData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                    <Tooltip {...chartTooltipProps} formatter={(v, name) => [v, name]} />
                    <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 12, color: 'var(--text)', paddingLeft: 16 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
        </ChartCard>

        <ChartCard title="Mechanic Feedback Summary">
          {totalFb === 0 ? <EmptyState label="No ratings yet" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 4 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <FeedbackStat count={helpful} label="Helpful Feedback" color="var(--success)" icon={ThumbsUp} />
              <FeedbackStat count={notHelpful} label="Not Helpful" color="var(--danger)" icon={ThumbsDown} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.82rem', color: 'var(--muted-foreground)' }}>
                <span style={{ fontWeight: 600 }}>Mechanic Satisfaction</span>
                <span style={{ fontWeight: 800, color: satColor }}>{satRate}%</span>
              </div>
              <div style={{ height: 8, background: 'var(--surface-alt)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, var(--success), var(--primary))', width: `${satRate}%`, transition: 'width 0.6s ease' }} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-alt)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Overall Quality Score</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <span key={star} style={{ fontSize: '1.1rem', color: star <= Math.round(avgRating) ? 'var(--warning)' : 'var(--border)' }}>★</span>
                  ))}
                </div>
                <span style={{ fontWeight: 900, color: 'var(--text)', fontSize: '0.95rem' }}>{avgRating.toFixed(1)} / 5</span>
              </div>
            </div>
          </div>
          )}
        </ChartCard>
      </div>
      </div>
      </SectionGate>

      <ChartCard title="Top Recurring Repair Issues (AI Knowledge Base)">
        <SectionGate state={sections.issueFreq} onRetry={() => retry('issueFreq')} height={220}>
        {issueFreq.length === 0
          ? <EmptyState label="No issue frequency data" />
          : <IssueFrequencyChart data={issueFreq.slice(0, 8)} gradientId="gradAiIssueBar" />}
        </SectionGate>
      </ChartCard>
    </div>
  );
}
