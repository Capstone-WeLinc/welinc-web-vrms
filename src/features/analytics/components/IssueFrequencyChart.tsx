import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { IssueFreq } from '../../../lib/api/analyticsApi';
import { axisTick, chartTooltipProps, cleanIssueLabel } from '../utils';

export function IssueFrequencyChart({ data, gradientId }: { data: IssueFreq[]; gradientId: string }) {
  return (
    <div style={{ maxHeight: 340, overflowY: 'auto', paddingRight: 6 }}>
      <div style={{ height: Math.max(220, data.length * 38), minWidth: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 24, right: 48, left: 16, bottom: 8 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.9} />
                <stop offset="100%" stopColor="var(--primary-strong)" stopOpacity={0.95} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" orientation="top" tick={axisTick} allowDecimals={false} axisLine={false} tickLine={false} />
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
              {...chartTooltipProps}
              formatter={(v) => [v, 'Occurrences']}
              labelFormatter={(label) => cleanIssueLabel(String(label || ''))}
            />
            <Bar
              dataKey="occurrence_count"
              name="Occurrences"
              fill={`url(#${gradientId})`}
              radius={[0, 6, 6, 0]}
              barSize={18}
              label={{ position: 'right', fill: 'var(--muted)', fontSize: 11, fontWeight: 700 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
