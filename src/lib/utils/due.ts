import type { RepairTicket } from '../../types';
import { OPEN_STATUSES } from '../repairStatus';

// Spec 0002 due rules, shared by the dashboard and the repair list (spec 0004). Every helper
// takes `now` (the time of the last successful fetch) and never reads the clock, so a row
// never changes its label without new data. Spec 0030: under 24 h the text counts hours, and
// Due soon comes from the backend's `dueSoonAt` (the browser can't read the settings behind it).

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

type DueTicket = Pick<RepairTicket, 'status' | 'dueAt'> & Partial<Pick<RepairTicket, 'dueSoonAt'>>;

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

/** Spec 0030, AC-11: open, not overdue, and past the backend's `dueSoonAt`. */
export function isDueSoon(ticket: DueTicket, now: number) {
  const soon = toTime(ticket.dueSoonAt);
  return isOpen(ticket) && !isOverdue(ticket, now) && soon !== null && soon <= now;
}

/** Spec 0030, AC-12: "5 h" under a day ("under 1 h" below an hour), else "2 days". */
export function spanText(ms: number) {
  const span = Math.max(0, ms);
  if (span < HOUR_MS) return 'under 1 h';
  if (span < DAY_MS) return `${Math.floor(span / HOUR_MS)} h`;
  return dayCount(wholeDays(0, span));
}

export function overdueText(ticket: DueTicket, now: number) {
  return `Overdue by ${spanText(now - (toTime(ticket.dueAt) ?? now))}`;
}

export function dueSoonText(ticket: DueTicket, now: number) {
  return `Due in ${spanText((toTime(ticket.dueAt) ?? now) - now)}`;
}

export type DueLabel = { text: string; overdue: boolean; dueSoon: boolean } | null;

/** Overdue text, due text, or nothing without a parsable due date. */
export function dueLabel(ticket: DueTicket, now: number): DueLabel {
  if (isOverdue(ticket, now)) return { text: overdueText(ticket, now), overdue: true, dueSoon: false };
  if (toTime(ticket.dueAt) === null) return null;
  // Spec 0030, AC-12: said in words too, so it never rests on color alone
  if (isDueSoon(ticket, now)) return { text: `Due soon, in ${spanText((toTime(ticket.dueAt) ?? now) - now)}`, overdue: false, dueSoon: true };
  return { text: dueSoonText(ticket, now), overdue: false, dueSoon: false };
}

/** "Nov 4", with the year only when it differs from the year of `now`, in the browser's timezone. */
export function dueDate(value: string, now: number) {
  const due = new Date(value);
  const sameYear = due.getFullYear() === new Date(now).getFullYear();
  return due.toLocaleDateString('en-US', sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "Nov 4, 3:00 PM": the Status card shows the time too, since a date can be hours away (spec 0030). */
export function dueDateTime(value: string, now: number) {
  const time = new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${dueDate(value, now)}, ${time}`;
}

/**
 * Spec 0024, AC-17 and spec 0030, AC-12: the Status card's Due row: the date and time, then a short note,
 * "4 days overdue", "5 h overdue", "in 2 days" or "in 5 h". Closed and Cancelled get the date alone.
 */
export type DueValue = { date: string; note: string | null; overdue: boolean; dueSoon: boolean };

export function dueValue(ticket: DueTicket, now: number): DueValue | null {
  const due = toTime(ticket.dueAt);
  if (due === null || !ticket.dueAt) return null;
  const date = dueDateTime(ticket.dueAt, now);
  if (!isOpen(ticket)) return { date, note: null, overdue: false, dueSoon: false };
  if (isOverdue(ticket, now)) return { date, note: `${spanText(now - due)} overdue`, overdue: true, dueSoon: false };
  return { date, note: `in ${spanText(due - now)}`, overdue: false, dueSoon: isDueSoon(ticket, now) };
}
