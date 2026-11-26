import { z } from 'zod';
import type { PriorityLevel } from '../../../types';
import type { UpcomingTrip } from '../../../lib/api/expediteApi';

// Spec 0029 (child 0003): the pure rules behind the Upcoming trips card and the expedite banner.

const ORDER: PriorityLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

/** AC-19: the Accept dialog starts one step above the ticket's priority, never above Critical. */
export function stepUpPriority(priority: PriorityLevel): PriorityLevel {
  const at = ORDER.indexOf(priority);
  return ORDER[Math.min(at + 1, ORDER.length - 1)];
}

/** A `YYYY-MM-DD` date as a local calendar day, so it never shifts a day across time zones. */
export function calendarDay(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** `Sat, Nov 29` plus `, 6:30 AM` when BMS has a dispatch time. */
export function tripWhen(trip: Pick<UpcomingTrip, 'serviceDate' | 'dispatchTime'>): string {
  const day = calendarDay(trip.serviceDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  if (!trip.dispatchTime) return day;
  const [h, min] = trip.dispatchTime.split(':').map(Number);
  const time = new Date(2000, 0, 1, h, min).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${day}, ${time}`;
}

/** BMS's dispatch status in words; anything new shows as BMS wrote it. */
export function tripStatusLabel(status: string): string {
  if (status === 'CONFIRMED') return 'Confirmed';
  if (status === 'PENDING') return 'Pending';
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
}

/** `Dec 1`, the day BMS needs the truck by, or null when BMS gave no date. */
export function neededByDay(neededBy: string | null): string | null {
  if (!neededBy) return null;
  return calendarDay(neededBy).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** A stored ISO time as the value of a `datetime-local` input, in the browser's time zone. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const acceptExpediteSchema = z.object({
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  /** Empty keeps the ticket's date. */
  dueAt: z
    .string()
    .refine((v) => v === '' || !Number.isNaN(new Date(v).getTime()), 'Enter a valid date and time.'),
});
export type AcceptExpediteValues = z.infer<typeof acceptExpediteSchema>;

/**
 * The accept body: the picked priority, and the date only when it differs from the ticket's,
 * so an untouched date field never rewrites the due date.
 */
export function acceptBody(
  values: AcceptExpediteValues,
  ticket: { dueAt?: string | null; updatedAt: string },
): { priority: PriorityLevel; dueAt?: string; updatedAt: string } {
  const body: { priority: PriorityLevel; dueAt?: string; updatedAt: string } = {
    priority: values.priority,
    updatedAt: ticket.updatedAt,
  };
  if (values.dueAt && values.dueAt !== toLocalInput(ticket.dueAt)) {
    body.dueAt = new Date(values.dueAt).toISOString();
  }
  return body;
}

/** The banner's title: who asks, and for how many Job Orders. */
export function expediteTitle(count: number): string {
  return count === 1 ? 'BMS asks to speed up this repair' : `BMS asks to speed up this repair for ${count} Job Orders`;
}
