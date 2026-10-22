import type { RepairStatus, RepairTicket } from '../../../types';

// Spec 0002. Every helper takes `now` (the hook's fetchedAt) and never reads the clock,
// so tiles and lists built from one fetch always agree.

const DAY_MS = 24 * 60 * 60 * 1000;
const OPEN_STATUSES: RepairStatus[] = ['PENDING', 'IN_PROGRESS', 'FOR_VERIFICATION'];
const MECHANIC_WORK_STATUSES: RepairStatus[] = ['PENDING', 'IN_PROGRESS'];

export const PIPELINE_STATUSES = ['PENDING', 'IN_PROGRESS', 'FOR_VERIFICATION', 'COMPLETED'] as const;
export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

export type SpendTimeframe = 'month' | '90d' | '365d' | 'all';

/** Milliseconds since the epoch, or null when the value is missing or unparsable. */
function toTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function sameLocalMonth(time: number, now: number) {
  const a = new Date(time);
  const b = new Date(now);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isOpen(ticket: RepairTicket) {
  return OPEN_STATUSES.includes(ticket.status);
}

export function isWaiting(ticket: RepairTicket) {
  return ticket.status === 'FOR_VERIFICATION';
}

export function isOverdue(ticket: RepairTicket, now: number) {
  const due = toTime(ticket.targetDueDate);
  return isOpen(ticket) && due !== null && due < now;
}

/** Whole 24 hour blocks from `from` to `to`, rounded down, never below 0. */
export function wholeDays(from: number, to: number) {
  return Math.max(0, Math.floor((to - from) / DAY_MS));
}

function dayCount(days: number) {
  return days === 1 ? '1 day' : `${days} days`;
}

export function overdueText(ticket: RepairTicket, now: number) {
  const days = wholeDays(toTime(ticket.targetDueDate) ?? now, now);
  return days === 0 ? 'Due today' : `Overdue by ${dayCount(days)}`;
}

export function dueSoonText(ticket: RepairTicket, now: number) {
  const days = wholeDays(now, toTime(ticket.targetDueDate) ?? now);
  return days === 0 ? 'Due today' : `Due in ${dayCount(days)}`;
}

export function updatedText(ticket: RepairTicket, now: number) {
  const days = wholeDays(toTime(ticket.updatedAt) ?? now, now);
  if (days === 0) return 'Updated today';
  return `Updated ${dayCount(days)} ago`;
}

export type DueLabel = { text: string; overdue: boolean } | null;

/** Admin Needs attention rows: overdue text, else the updated text (waiting rows). */
export function attentionDueLabel(ticket: RepairTicket, now: number): DueLabel {
  if (isOverdue(ticket, now)) return { text: overdueText(ticket, now), overdue: true };
  return { text: updatedText(ticket, now), overdue: false };
}

/** Mechanic work rows: overdue text, due soon text, or nothing without a due date. */
export function workDueLabel(ticket: RepairTicket, now: number): DueLabel {
  if (isOverdue(ticket, now)) return { text: overdueText(ticket, now), overdue: true };
  if (toTime(ticket.targetDueDate) === null) return null;
  return { text: dueSoonText(ticket, now), overdue: false };
}

const byTime = (pick: (t: RepairTicket) => string | null | undefined, direction: 1 | -1) =>
  (a: RepairTicket, b: RepairTicket) => direction * ((toTime(pick(a)) ?? 0) - (toTime(pick(b)) ?? 0));

/** Overdue first (oldest due date first), then waiting and not overdue (oldest update first). Each ticket once. */
export function attentionList(active: RepairTicket[], now: number, limit: number) {
  const overdue = active.filter((t) => isOverdue(t, now)).sort(byTime((t) => t.targetDueDate, 1));
  const waiting = active.filter((t) => isWaiting(t) && !isOverdue(t, now)).sort(byTime((t) => t.updatedAt, 1));
  return [...overdue, ...waiting].slice(0, limit);
}

/** A mechanic's PENDING and IN_PROGRESS tickets: overdue first, then due soonest (none last), then newest update. */
export function mechanicWorkList(active: RepairTicket[], now: number) {
  return active
    .filter((t) => MECHANIC_WORK_STATUSES.includes(t.status))
    .sort((a, b) => {
      const overdueDiff = Number(isOverdue(b, now)) - Number(isOverdue(a, now));
      if (overdueDiff !== 0) return overdueDiff;
      const dueA = toTime(a.targetDueDate);
      const dueB = toTime(b.targetDueDate);
      if (dueA !== dueB) {
        if (dueA === null) return 1;
        if (dueB === null) return -1;
        return dueA - dueB;
      }
      return byTime((t) => t.updatedAt, -1)(a, b);
    });
}

export function countMechanicOverdue(active: RepairTicket[], now: number) {
  return active.filter((t) => MECHANIC_WORK_STATUSES.includes(t.status) && isOverdue(t, now)).length;
}

/** The history fields the dashboard reads; history rows are slimmer than a full ticket. */
type ClosedTicket = Pick<RepairTicket, 'status' | 'completedAt'>;
export type SpendTicket = Pick<RepairTicket, 'status' | 'createdAt' | 'totalCost'>;

function isCompletedThisMonth(ticket: ClosedTicket, now: number) {
  const completed = toTime(ticket.completedAt);
  return ticket.status === 'COMPLETED' && completed !== null && sameLocalMonth(completed, now);
}

export function completedThisMonth(history: ClosedTicket[], now: number) {
  return history.filter((t) => isCompletedThisMonth(t, now)).length;
}

/** Open tickets by status, plus Completed for this month only (matches the Done this month tile). */
export function pipelineCounts(active: RepairTicket[], history: ClosedTicket[], now: number): Record<PipelineStatus, number> {
  const counts: Record<PipelineStatus, number> = { PENDING: 0, IN_PROGRESS: 0, FOR_VERIFICATION: 0, COMPLETED: 0 };
  for (const ticket of active) {
    if (isOpen(ticket)) counts[ticket.status as PipelineStatus]++;
  }
  counts.COMPLETED = completedThisMonth(history, now);
  return counts;
}

function inTimeframe(ticket: SpendTicket, timeframe: SpendTimeframe, now: number) {
  if (timeframe === 'all') return true;
  const created = toTime(ticket.createdAt);
  if (created === null) return false;
  if (timeframe === 'month') return sameLocalMonth(created, now);
  const days = timeframe === '90d' ? 90 : 365;
  return created >= now - days * DAY_MS;
}

/** Spend over active and COMPLETED tickets (CANCELLED left out), filtered by createdAt. */
export function spendFor(tickets: SpendTicket[], timeframe: SpendTimeframe, now: number) {
  const inRange = tickets.filter((t) => t.status !== 'CANCELLED' && inTimeframe(t, timeframe, now));
  const total = inRange.reduce((sum, t) => sum + (t.totalCost ?? 0), 0);
  const costed = inRange.filter((t) => (t.totalCost ?? 0) > 0);
  const average = costed.length ? Math.round(costed.reduce((sum, t) => sum + (t.totalCost ?? 0), 0) / costed.length) : 0;
  return { total, average };
}

export function formatTime(time: number) {
  return new Date(time).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function greeting(name: string | null | undefined) {
  const trimmed = name?.trim();
  return trimmed ? `Welcome back, ${trimmed}.` : 'Welcome back.';
}
