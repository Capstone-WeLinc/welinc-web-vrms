import type { RepairStatus, RepairTicket } from '../../../types';
import { dayCount, type DueLabel, isOpen, isOverdue, overdueText, toTime, wholeDays } from '../../../lib/utils/due';

// Spec 0002. Every helper takes `now` (the hook's fetchedAt) and never reads the clock,
// so tiles and lists built from one fetch always agree. The due rules live in lib/utils/due.

const DAY_MS = 24 * 60 * 60 * 1000;
const MECHANIC_WORK_STATUSES: RepairStatus[] = ['ASSIGNED', 'IN_PROGRESS'];

// The stages a ticket moves through today (spec 0010); hold, outsourcing and approval arrive with feature 16
export const PIPELINE_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'FOR_VERIFICATION', 'CLOSED'] as const;
export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

export type SpendTimeframe = 'month' | '90d' | '365d' | 'all';

function sameLocalMonth(time: number, now: number) {
  const a = new Date(time);
  const b = new Date(now);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isWaiting(ticket: RepairTicket) {
  return ticket.status === 'FOR_VERIFICATION';
}

export function updatedText(ticket: RepairTicket, now: number) {
  const days = wholeDays(toTime(ticket.updatedAt) ?? now, now);
  if (days === 0) return 'Updated today';
  return `Updated ${dayCount(days)} ago`;
}

/** Admin Needs attention rows: overdue text, else the updated text (waiting rows). */
export function attentionDueLabel(ticket: RepairTicket, now: number): DueLabel {
  if (isOverdue(ticket, now)) return { text: overdueText(ticket, now), overdue: true };
  return { text: updatedText(ticket, now), overdue: false };
}

const byTime = (pick: (t: RepairTicket) => string | null | undefined, direction: 1 | -1) =>
  (a: RepairTicket, b: RepairTicket) => direction * ((toTime(pick(a)) ?? 0) - (toTime(pick(b)) ?? 0));

/** Overdue first (oldest due date first), then waiting and not overdue (oldest update first). Each ticket once. */
export function attentionList(active: RepairTicket[], now: number, limit: number) {
  const overdue = active.filter((t) => isOverdue(t, now)).sort(byTime((t) => t.dueAt, 1));
  const waiting = active.filter((t) => isWaiting(t) && !isOverdue(t, now)).sort(byTime((t) => t.updatedAt, 1));
  return [...overdue, ...waiting].slice(0, limit);
}

/** A mechanic's ASSIGNED and IN_PROGRESS tickets: overdue first, then due soonest (none last), then newest update. */
export function mechanicWorkList(active: RepairTicket[], now: number) {
  return active
    .filter((t) => MECHANIC_WORK_STATUSES.includes(t.status))
    .sort((a, b) => {
      const overdueDiff = Number(isOverdue(b, now)) - Number(isOverdue(a, now));
      if (overdueDiff !== 0) return overdueDiff;
      const dueA = toTime(a.dueAt);
      const dueB = toTime(b.dueAt);
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
type FinishedTicket = Pick<RepairTicket, 'status' | 'closedAt'>;
export type SpendTicket = Pick<RepairTicket, 'status' | 'createdAt' | 'totalCost'>;

function isClosedThisMonth(ticket: FinishedTicket, now: number) {
  const closed = toTime(ticket.closedAt);
  return ticket.status === 'CLOSED' && closed !== null && sameLocalMonth(closed, now);
}

export function closedThisMonth(history: FinishedTicket[], now: number) {
  return history.filter((t) => isClosedThisMonth(t, now)).length;
}

function isPipelineStatus(status: RepairStatus): status is PipelineStatus {
  return (PIPELINE_STATUSES as readonly RepairStatus[]).includes(status);
}

/** Open tickets by stage, plus Closed for this month only (matches the Done this month tile). */
export function pipelineCounts(active: RepairTicket[], history: FinishedTicket[], now: number): Record<PipelineStatus, number> {
  const counts: Record<PipelineStatus, number> = { ASSIGNED: 0, IN_PROGRESS: 0, FOR_VERIFICATION: 0, CLOSED: 0 };
  for (const ticket of active) {
    if (isOpen(ticket) && isPipelineStatus(ticket.status)) counts[ticket.status]++;
  }
  counts.CLOSED = closedThisMonth(history, now);
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

/** Spend over active and CLOSED tickets (CANCELLED left out), filtered by createdAt. */
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
