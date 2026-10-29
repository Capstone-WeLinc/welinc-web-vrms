import type { RepairTicket } from '../../types';
import { OPEN_STATUSES } from '../repairStatus';

// Spec 0002 due rules, shared by the dashboard and the repair list (spec 0004). Every helper
// takes `now` (the time of the last successful fetch) and never reads the clock, so a row
// never changes its label without new data.

const DAY_MS = 24 * 60 * 60 * 1000;

type DueTicket = Pick<RepairTicket, 'status' | 'dueAt'>;

/** Milliseconds since the epoch, or null when the value is missing or unparsable. */
export function toTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

/** Whole 24 hour blocks from `from` to `to`, rounded down, never below 0. */
export function wholeDays(from: number, to: number) {
  return Math.max(0, Math.floor((to - from) / DAY_MS));
}

export function dayCount(days: number) {
  return days === 1 ? '1 day' : `${days} days`;
}

export function isOpen(ticket: Pick<RepairTicket, 'status'>) {
  return OPEN_STATUSES.includes(ticket.status);
}

export function isOverdue(ticket: DueTicket, now: number) {
  const due = toTime(ticket.dueAt);
  return isOpen(ticket) && due !== null && due < now;
}

export function overdueText(ticket: DueTicket, now: number) {
  const days = wholeDays(toTime(ticket.dueAt) ?? now, now);
  return days === 0 ? 'Due today' : `Overdue by ${dayCount(days)}`;
}

export function dueSoonText(ticket: DueTicket, now: number) {
  const days = wholeDays(now, toTime(ticket.dueAt) ?? now);
  return days === 0 ? 'Due today' : `Due in ${dayCount(days)}`;
}

export type DueLabel = { text: string; overdue: boolean } | null;

/** Overdue text, due soon text, or nothing without a parsable due date. */
export function dueLabel(ticket: DueTicket, now: number): DueLabel {
  if (isOverdue(ticket, now)) return { text: overdueText(ticket, now), overdue: true };
  if (toTime(ticket.dueAt) === null) return null;
  return { text: dueSoonText(ticket, now), overdue: false };
}
