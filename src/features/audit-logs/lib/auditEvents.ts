import {
  Activity,
  ArrowLeftRight,
  BookOpen,
  FilePlus2,
  FileX2,
  Images,
  ListPlus,
  ListX,
  ListChecks,
  ListRestart,
  Lock,
  PencilLine,
  LockOpen,
  Paperclip,
  UserMinus,
  UserPlus,
  PhilippinePeso,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import { ALL_TIME, type DateRangeValue } from '../../../components/shared/date-range/dateRange';
import { PRIORITY_MAP } from '../../../components/shared/priorityStyles';
import { formatPeso } from '../../../lib/utils/format';
import type { AuditChange, AuditEvent } from '../../../types';

// Spec 0003, AC-10 to AC-12, on the spec 0010 shape: one event with its list of changes.

export type EventTypeFilter =
  | 'all'
  | 'CREATED'
  | 'STATUS_CHANGE'
  | 'COST_UPDATE'
  | 'UNLOCK'
  | 'GARAGE_CHANGE'
  | 'TICKET_EDITED'
  | 'ISSUE_ADDED'
  | 'ISSUE_EDITED'
  | 'ISSUE_REMOVED';

export const TYPE_CHIPS: { value: EventTypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'CREATED', label: 'Created' },
  { value: 'STATUS_CHANGE', label: 'Status' },
  { value: 'COST_UPDATE', label: 'Costs' },
  { value: 'UNLOCK', label: 'Unlocks' },
  { value: 'GARAGE_CHANGE', label: 'Garage' },
  // Spec 0019, AC-19b
  { value: 'TICKET_EDITED', label: 'Edits' },
  { value: 'ISSUE_ADDED', label: 'Issue added' },
  { value: 'ISSUE_EDITED', label: 'Issue edited' },
  { value: 'ISSUE_REMOVED', label: 'Issue removed' },
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
  ATTACHMENT_MOVED: { icon: Images, tone: 'bg-primary/10 text-primary' },
  TICKET_EDITED: { icon: PencilLine, tone: 'bg-primary/10 text-primary' },
  ISSUE_ADDED: { icon: ListPlus, tone: 'bg-primary/10 text-primary' },
  ISSUE_EDITED: { icon: PencilLine, tone: 'bg-primary/10 text-primary' },
  ISSUE_REMOVED: { icon: ListX, tone: 'bg-muted text-muted-strong' },
  // Spec 0021, AC-15
  LOCKED: { icon: Lock, tone: 'bg-muted text-muted-strong' },
  STEP_CHECKED: { icon: ListChecks, tone: 'bg-success/10 text-success' },
  STEP_UNCHECKED: { icon: ListRestart, tone: 'bg-muted text-muted-strong' },
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

/** Spec 0018, AC-18: the photo kinds read as their group, whatever label the row was written with. */
const PHOTO_GROUPS: Record<string, string> = { VEHICLE_PHOTO: 'Before', PROOF: 'After' };

/** The file name from a stored "<label>: <name>" (the label never holds ": "). */
function fileNameOf(stored: string) {
  const at = stored.indexOf(': ');
  return at >= 0 ? stored.slice(at + 2) : stored;
}

/**
 * The line under an attachment added or removed event. A photo names its group ("Before photo:
 * front.jpg"), so rows written as "Vehicle photo" or "Proof of completion" read the new way too.
 */
export function attachmentLine(event: Pick<AuditEvent, 'changes'>): string | null {
  const file = changeOf(event, 'attachment');
  const stored = file?.after ?? file?.before;
  if (!stored) return null;
  const group = PHOTO_GROUPS[changeOf(event, 'kind')?.after ?? ''];
  return group ? `${group} photo: ${fileNameOf(stored)}` : stored;
}

/** Spec 0018, AC-18: "Moved a photo from Before to After", or null when the change is missing. */
export function photoMoveLine(event: Pick<AuditEvent, 'changes'>): string | null {
  const kind = changeOf(event, 'kind');
  const from = PHOTO_GROUPS[kind?.before ?? ''];
  const to = PHOTO_GROUPS[kind?.after ?? ''];
  return from && to ? `Moved a photo from ${from} to ${to}` : null;
}

/** The moved file's name, for the line under the move. */
export function movedFileName(event: Pick<AuditEvent, 'changes'>): string | null {
  const file = changeOf(event, 'attachment');
  const stored = file?.after ?? file?.before;
  return stored ? fileNameOf(stored) : null;
}

// ── Spec 0019, AC-19b: edits after create ───────────────────────────────────────

const ACCOUNT_LABELS: Record<string, string> = { ONLINE: 'Online', CORPORATE: 'Corporate' };

function account(type: string | null | undefined, corporation: string | null | undefined) {
  if (!type) return 'Not set';
  const label = ACCOUNT_LABELS[type] ?? type;
  return type === 'CORPORATE' && corporation ? `${label} (${corporation})` : label;
}

/** One plain line per change on a TICKET_EDITED row: "Priority: Medium → High". */
export function ticketEditLines(event: Pick<AuditEvent, 'changes'>): string[] {
  const lines: string[] = [];
  const driver = changeOf(event, 'driver');
  if (driver) lines.push(`Driver: ${driver.before ?? 'None'} → ${driver.after ?? 'None'}`);
  const odometer = changeOf(event, 'odometer');
  if (odometer) {
    const km = (v: string | null) => (v == null ? 'None' : Number(v).toLocaleString('en-US'));
    lines.push(`Odometer: ${km(odometer.before)} → ${km(odometer.after)} km`);
  }
  const priority = changeOf(event, 'priority');
  if (priority) {
    const label = (v: string | null) => (v ? (PRIORITY_MAP[v]?.label ?? v) : 'None');
    lines.push(`Priority: ${label(priority.before)} → ${label(priority.after)}`);
  }
  const type = changeOf(event, 'accountType');
  const corporation = changeOf(event, 'corporation');
  if (type) {
    lines.push(`Account: ${account(type.before, corporation?.before)} → ${account(type.after, corporation?.after)}`);
  } else if (corporation) {
    lines.push(`Corporation: ${corporation.before ?? 'None'} → ${corporation.after ?? 'None'}`);
  }
  return lines;
}

/**
 * Spec 0021, AC-15: the free text a TICKET_EDITED row can carry after an unlock, "Remarks: old →
 * new" and "Cancel reason: old → new". Kept apart from ticketEditLines because they can be long
 * and render clamped, with the full line in a tooltip.
 */
export function ticketTextLines(event: Pick<AuditEvent, 'changes'>): string[] {
  const lines: string[] = [];
  const remarks = changeOf(event, 'remarks');
  if (remarks) lines.push(`Remarks: ${remarks.before ?? 'None'} → ${remarks.after ?? 'None'}`);
  const reason = changeOf(event, 'cancellationReason');
  if (reason) lines.push(`Cancel reason: ${reason.before ?? 'None'} → ${reason.after ?? 'None'}`);
  return lines;
}

/** Spec 0021, AC-15: the ticked or unticked step, "2. Check brake fluid". */
export function stepLine(event: Pick<AuditEvent, 'changes'>): string | null {
  return changeOf(event, 'step')?.after ?? null;
}

/** The lines under an issue event: its text, and what else changed or went with it. */
export function issueEventLines(event: Pick<AuditEvent, 'type' | 'changes'>): string[] {
  if (event.type === 'ISSUE_ADDED') {
    const issue = changeOf(event, 'issue');
    return issue?.after ? [issue.after] : [];
  }
  if (event.type === 'ISSUE_EDITED') {
    const lines: string[] = [];
    const description = changeOf(event, 'description');
    if (description?.after) lines.push(`Now: ${description.after}`);
    if (description?.before) lines.push(`Was: ${description.before}`);
    const system = changeOf(event, 'system');
    if (system) lines.push(`System: ${system.before ?? 'None'} → ${system.after ?? 'None'}`);
    const fix = changeOf(event, 'knowledgeEntry');
    if (fix?.before && !fix.after) lines.push(`Known fix removed: ${fix.before}`);
    return lines;
  }
  if (event.type === 'ISSUE_REMOVED') {
    const lines: string[] = [];
    const issue = changeOf(event, 'issue');
    if (issue?.before) lines.push(issue.before);
    const note = changeOf(event, 'resolutionNote');
    if (note?.before) lines.push(`What fixed it: ${note.before}`);
    return lines;
  }
  return [];
}
