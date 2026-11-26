import type { ReactNode } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, ChevronDown } from 'lucide-react';
import { ErrorState } from '../../../components/shared/ErrorState';
import type { SectionState } from '../hooks/useAnalyticsData';
import { PERIOD_OPTIONS } from '../utils';
import { SegmentedControl, SegmentedControlItem } from '../../../components/ui/segmented-control';

/** A period or sort switch on a chart: the suite SegmentedControl (spec 0016 AC-8), never a gold pill. */
export function PillToggle<T extends string>({
  options, value, onChange, labels, label,
}: {
  options: readonly T[]; value: T; onChange: (v: T) => void;
  labels?: Partial<Record<T, string>>; label?: string;
}) {
  return (
    <SegmentedControl value={value} onValueChange={(v) => onChange(v as T)} aria-label={label}>
      {options.map(o => (
        <SegmentedControlItem key={o} value={o}>{labels?.[o] ?? o}</SegmentedControlItem>
      ))}
    </SegmentedControl>
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-subheading text-foreground">{title}</h3>
        <div className="flex max-w-full items-center gap-2">
          {extraRight}
          {onPeriodChange && (
            <PillToggle options={PERIOD_OPTIONS} value={period ?? 'ALL'} onChange={onPeriodChange} label={`${title} period`} />
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

/** A summary number on the StatCard look (spec 0016 AC-14, AC-18): label, mono number, one line, no icon square. */
export function KpiCard({ label, value, delta, note }: {
  label: string; value: string | number; delta?: number; note?: string;
}) {
  return (
    <div className="premium-card flex min-w-0 flex-col gap-2">
      <span className="text-label text-muted-strong">{label}</span>
      <span className="font-mono text-display font-semibold text-foreground">{value}</span>
      {delta !== undefined && (
        <span className={`flex items-center gap-1 text-small ${delta > 0 ? 'text-success' : delta < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
          {delta > 0 ? <ArrowUpRight aria-hidden="true" className="size-4" /> : delta < 0 ? <ArrowDownRight aria-hidden="true" className="size-4" /> : <Minus aria-hidden="true" className="size-4" />}
          {Math.abs(delta)}% vs last period
        </span>
      )}
      {note && <span className="text-small text-muted-foreground">{note}</span>}
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

/** One section's loading, error with Retry, or its content (spec 0013, AC-6). */
export function SectionGate({ state, onRetry, height = 160, children }: {
  state: SectionState; onRetry: () => void; height?: number; children: ReactNode;
}) {
  if (state.status === 'loading') {
    return <div aria-busy="true" style={{ height, borderRadius: 8, background: 'var(--surface-alt)', animation: 'pulse 1.5s ease-in-out infinite' }} />;
  }
  if (state.status === 'error') {
    return <ErrorState kind="tile" subject="charts" title="This section didn’t load" message={state.error} onRetry={onRetry} retryText="Retry" />;
  }
  return <>{children}</>;
}
