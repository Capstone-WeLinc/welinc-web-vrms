import {
  Activity,
  ArrowLeftRight,
  BookOpen,
  FilePlus2,
  FileX2,
  LockOpen,
  Paperclip,
  UserMinus,
  UserPlus,
  PhilippinePeso,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import { ALL_TIME, type DateRangeValue } from '../../../components/shared/date-range/dateRange';
import { formatPeso } from '../../../lib/utils/format';
import type { AuditChange, AuditEvent } from '../../../types';

// Spec 0003, AC-10 to AC-12, on the spec 0010 shape: one event with its list of changes.

export type EventTypeFilter = 'all' | 'CREATED' | 'STATUS_CHANGE' | 'COST_UPDATE' | 'UNLOCK' | 'GARAGE_CHANGE';

export const TYPE_CHIPS: { value: EventTypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'CREATED', label: 'Created' },
  { value: 'STATUS_CHANGE', label: 'Status' },
  { value: 'COST_UPDATE', label: 'Costs' },
  { value: 'UNLOCK', label: 'Unlocks' },
  { value: 'GARAGE_CHANGE', label: 'Garage' },
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
  GARAGE_CHANGE: { icon: Warehouse, tone: 'bg-muted text-muted-strong' },
  KNOWLEDGE_LINK: { icon: BookOpen, tone: 'bg-primary/10 text-primary' },
  MECHANIC_UNASSIGNED: { icon: UserMinus, tone: 'bg-muted text-muted-strong' },
  MECHANIC_ASSIGNED: { icon: UserPlus, tone: 'bg-primary/10 text-primary' },
  ATTACHMENT_ADDED: { icon: Paperclip, tone: 'bg-primary/10 text-primary' },
  ATTACHMENT_REMOVED: { icon: FileX2, tone: 'bg-muted text-muted-strong' },
};

export function eventStyle(type: string): EventStyle {
  return EVENT_STYLES[type] ?? { icon: Activity, tone: 'bg-muted text-muted-strong' };
}

/** The actor's name, else their email; null means "no actor" wording. */
export function actorLabel(event: AuditEvent) {
  return event.actor?.name || event.actor?.email || null;
}

/** The change to one field, or undefined when the event didn't change it. */
export function changeOf(event: Pick<AuditEvent, 'changes'>, field: string): AuditChange | undefined {
  return event.changes.find((change) => change.field === field);
}

/** A stored amount ("1200.00") as pesos; an empty one reads as nothing recorded. */
const peso = (amount: string | null) => (amount == null ? 'none' : formatPeso(Number(amount)));

function moneyMove(change: AuditChange) {
  return change.before == null ? peso(change.after) : `${peso(change.before)} → ${peso(change.after)}`;
}

/** "₱4,000 → ₱5,200 total", or null when the total didn't change. */
export function costTotalLine(event: AuditEvent) {
  const total = changeOf(event, 'totalCost');
  return total ? `${moneyMove(total)} total` : null;
}

/** "Parts ₱3,000 → ₱3,500 · Labor ₱1,000 → ₱1,700 · Lump sum": only the parts that changed. */
export function costDetailLine(event: AuditEvent) {
  const parts = changeOf(event, 'partsCost');
  const labor = changeOf(event, 'laborCost');
  const lumpSum = changeOf(event, 'isLumpSum');
  const bits = [
    parts && `Parts ${moneyMove(parts)}`,
    labor && `Labor ${moneyMove(labor)}`,
    lumpSum && (lumpSum.after === 'true' ? 'Lump sum' : 'Itemized'),
  ].filter(Boolean);
  return bits.length ? bits.join(' · ') : null;
}
