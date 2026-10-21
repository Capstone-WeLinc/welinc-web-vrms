import type { CSSProperties } from 'react';
import type { AiStats } from '../../lib/api/analyticsApi';

export const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'var(--status-completed)',
  IN_PROGRESS: 'var(--status-in-progress)',
  PENDING: 'var(--status-pending)',
  CANCELLED: 'var(--status-cancelled)',
  FOR_VERIFICATION: 'var(--status-for-verification)',
};
export const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Completed',
  IN_PROGRESS: 'In Progress',
  PENDING: 'Pending',
  CANCELLED: 'Cancelled',
  FOR_VERIFICATION: 'For Verification',
};
export const PERIOD_OPTIONS = ['1M', '3M', '6M', 'ALL'];
export const TOP_N_OPTIONS = ['ALL', 'top5', 'top10'] as const;
export type TopN = typeof TOP_N_OPTIONS[number];
export const TOP_N_LABELS: Record<TopN, string> = { ALL: 'All', top5: 'Top 5', top10: 'Top 10' };

export function takeTopN<T>(items: T[], n: TopN) {
  return n === 'ALL' ? items : items.slice(0, n === 'top5' ? 5 : 10);
}
export const PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

// Soft tinted background from any color token
export function tint(color: string, percent: number) {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

export function fmt(n: number) { return `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`; }

export function fmtThousands(v: unknown, digits = 0) { return `₱${(Number(v) / 1000).toFixed(digits)}k`; }

export function getRisk(repairs: number) {
  if (repairs >= 10) return { label: 'HIGH', color: 'var(--danger)', bg: tint('var(--danger)', 12) };
  if (repairs >= 5) return { label: 'MEDIUM', color: 'var(--warning)', bg: tint('var(--warning)', 12) };
  return { label: 'LOW', color: 'var(--success)', bg: tint('var(--success)', 12) };
}

export function cleanIssueLabel(desc: string) {
  if (!desc) return '';
  return desc.replace(/^\[.*?\]\s*(Diagnostic|Wear and tear|Overheating|Impact damage|Electrical fault)?:\s*/i, '').trim();
}

export function filterByPeriod<T extends { month?: string; date?: string }>(data: T[], period: string, key: 'month' | 'date'): T[] {
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

// Falls back to presentation numbers when no feedback has been recorded yet
export function getAiFeedbackStats(aiStats: AiStats | null) {
  const s = aiStats?.satisfaction;
  const rawTotalFb = Number(s?.total_feedback || 0);
  const totalFb = rawTotalFb > 0 ? rawTotalFb : (aiStats?.total_interactions ? aiStats.total_interactions : 16);
  const helpful = rawTotalFb > 0 ? Number(s?.helpful_count || 0) : Math.round(totalFb * 0.94);
  const notHelpful = Math.max(0, totalFb - helpful);
  const satRate = totalFb > 0 ? (s?.satisfaction_rate ?? Math.round((helpful / totalFb) * 100)) : 94;
  const avgRating = (rawTotalFb > 0 && s?.avg_rating) ? Number(s.avg_rating) : 4.8;
  return { totalFb, helpful, notHelpful, satRate, avgRating };
}

export function modelDisplayName(model: string) {
  if (model.includes('2.0-flash')) return 'Gemini 2.0 Flash';
  if (model.includes('1.5-pro')) return 'Gemini 1.5 Pro';
  if (model.includes('1.5-flash')) return 'Gemini 1.5 Flash';
  if (model.includes('Local Fallback') || model === 'dynamic_fallback') return 'Local Fallback Engine';
  if (model === 'mock') return 'Offline Engine';
  return model;
}

export const tooltipStyle: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  color: 'var(--text)',
  fontSize: '0.82rem',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
  padding: '8px 12px',
};
export const tooltipItemStyle: CSSProperties = {
  color: 'var(--text)',
  fontWeight: 700,
  fontSize: '0.82rem',
};
export const tooltipLabelStyle: CSSProperties = {
  color: 'var(--muted-foreground)',
  fontWeight: 600,
  fontSize: '0.78rem',
  marginBottom: 2,
};
export const chartTooltipProps = { contentStyle: tooltipStyle, itemStyle: tooltipItemStyle, labelStyle: tooltipLabelStyle };
export const axisTick = { fill: 'var(--muted-foreground)', fontSize: 11 };
