import {
  Activity,
  ArrowLeftRight,
  BookOpen,
  FilePlus2,
  LockOpen,
  PhilippinePeso,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import { ALL_TIME, type DateRangeValue } from '../../../components/shared/date-range/dateRange';
import { formatPeso } from '../../../lib/utils/format';
import type { AuditEvent, CostSnapshot } from '../../../types';

// Spec 0003, AC-10 to AC-12.

export type EventTypeFilter = 'all' | 'CREATED' | 'STATUS_CHANGE' | 'COST_UPDATE' | 'UNLOCK' | 'SHOP_CHANGE';

export const TYPE_CHIPS: { value: EventTypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'CREATED', label: 'Created' },
  { value: 'STATUS_CHANGE', label: 'Status' },
  { value: 'COST_UPDATE', label: 'Costs' },
  { value: 'UNLOCK', label: 'Unlocks' },
  { value: 'SHOP_CHANGE', label: 'Shop' },
];

export type AuditFilterValues = {
  type: EventTypeFilter;
  /** A VRMS user id from the actors list, or 'all'. */
  actorId: string;
  range: DateRangeValue;
  repairNumber: string;
};

export const DEFAULT_AUDIT_FILTERS: AuditFilterValues = {
  type: 'all',
  actorId: 'all',
  range: ALL_TIME,
  repairNumber: '',
};

export const AUDIT_PAGE_SIZE = 50;

export function hasActiveAuditFilters(filters: AuditFilterValues) {
  return (
    filters.type !== 'all' ||
    filters.actorId !== 'all' ||
    filters.range.preset !== 'all' ||
    filters.repairNumber.trim() !== ''
  );
}

type EventStyle = { icon: LucideIcon; tone: string };

// Token tints only. Gold is a fill with dark text, never text on white.
const EVENT_STYLES: Record<string, EventStyle> = {
  CREATED: { icon: FilePlus2, tone: 'bg-primary/10 text-primary' },
  STATUS_CHANGE: { icon: ArrowLeftRight, tone: 'bg-primary/10 text-primary' },
  COST_UPDATE: { icon: PhilippinePeso, tone: 'bg-success/10 text-success' },
  UNLOCK: { icon: LockOpen, tone: 'bg-highlight/25 text-highlight-foreground' },
  SHOP_CHANGE: { icon: Warehouse, tone: 'bg-muted text-muted-strong' },
  KNOWLEDGE_LINK: { icon: BookOpen, tone: 'bg-primary/10 text-primary' },
};

export function eventStyle(type: string): EventStyle {
  return EVENT_STYLES[type] ?? { icon: Activity, tone: 'bg-muted text-muted-strong' };
}

/** The actor's name, else their email; null means "no actor" wording. */
export function actorLabel(event: AuditEvent) {
  return event.actor?.name || event.actor?.email || null;
}

/** Old cost rows stored ₱0 as null, so a missing amount reads as ₱0. */
const peso = (amount: number | null | undefined) => formatPeso(amount ?? 0);

/** "₱4,000 → ₱5,200 total", or null when the new costs can't be read (sentence only). */
export function costTotalLine(cost: AuditEvent['cost']) {
  if (!cost?.to) return null;
  return cost.from ? `${peso(cost.from.total)} → ${peso(cost.to.total)} total` : `${peso(cost.to.total)} total`;
}

/** "Parts ₱3,000 → ₱3,500 · Labor ₱1,000 → ₱1,700", or "Lump sum". */
export function costDetailLine(cost: AuditEvent['cost']) {
  if (!cost?.to) return null;
  if (cost.to.isLumpSum) return 'Lump sum';
  const part = (label: string, pick: (s: CostSnapshot) => number | null) =>
    cost.from ? `${label} ${peso(pick(cost.from))} → ${peso(pick(cost.to!))}` : `${label} ${peso(pick(cost.to!))}`;
  return `${part('Parts', (s) => s.partsCost)} · ${part('Labor', (s) => s.laborCost)}`;
}
