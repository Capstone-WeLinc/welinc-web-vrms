import type { ReactNode } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PERIOD_OPTIONS, tint } from '../utils';

export function PillToggle<T extends string>({
  options, value, onChange, labels, track = 'var(--surface-alt)', size = 'sm',
}: {
  options: readonly T[]; value: T; onChange: (v: T) => void;
  labels?: Partial<Record<T, string>>; track?: string; size?: 'sm' | 'md';
}) {
  return (
    <div style={{ display: 'flex', background: track, borderRadius: 8, padding: 2, gap: 1 }}>
      {options.map(o => (
        <button
          key={o}
          onClick={() => onChange(o)}
          style={{
            padding: size === 'md' ? '4px 10px' : '3px 9px', borderRadius: 6, border: 'none',
            fontSize: size === 'md' ? '0.75rem' : '0.72rem',
            fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
            background: value === o ? 'var(--highlight)' : 'transparent',
            color: value === o ? 'var(--on-accent)' : 'var(--muted-foreground)',
          }}
        >{labels?.[o] ?? o}</button>
      ))}
    </div>
  );
}

export function ChartCard({
  title, children, onPeriodChange, period, extraRight,
}: {
  title: string; children: ReactNode;
  onPeriodChange?: (p: string) => void; period?: string; extraRight?: ReactNode;
}) {
  return (
    <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {extraRight}
          {onPeriodChange && (
            <PillToggle options={PERIOD_OPTIONS} value={period ?? 'ALL'} onChange={onPeriodChange} track="var(--surface)" />
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

export function KpiCard({ label, value, icon: Icon, color, delta, note }: {
  label: string; value: string | number; icon: LucideIcon; color: string;
  delta?: number; note?: string;
}) {
  return (
    <div className="premium-card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: tint(color, 10), color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
        <Icon size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{value}</div>
        {delta !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            {delta > 0 ? <ArrowUpRight size={13} color="var(--success)" /> : delta < 0 ? <ArrowDownRight size={13} color="var(--danger)" /> : <Minus size={13} color="var(--muted-foreground)" />}
            <span style={{ fontSize: '0.72rem', color: delta > 0 ? 'var(--success)' : delta < 0 ? 'var(--danger)' : 'var(--muted-foreground)', fontWeight: 700 }}>
              {Math.abs(delta)}% vs last period
            </span>
          </div>
        )}
        {note && <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: 4 }}>{note}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--muted-foreground)', fontSize: '0.875rem', flexDirection: 'column', gap: 8 }}>
      <ChevronDown size={24} strokeWidth={1.5} />
      {label}
    </div>
  );
}
