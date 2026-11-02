import { z } from 'zod';
import type { EditDetailsPayload } from '../../../lib/api/repairApi';
import type { PriorityLevel, RepairTicket } from '../../../types';
import { isClosed } from './nextAction';

// Spec 0019: fixing a ticket after create. The server checks every rule again; these decide what
// the page offers and what a dialog sends.

/** The server's reason limits on an unlocked closed ticket (AC-3). */
export const EDIT_REASON_MIN = 5;
export const EDIT_REASON_MAX = 500;

/**
 * AC-2: edits are open in every open status, and on a Closed or Cancelled ticket only while it is
 * unlocked. `isUnlocked` comes with the cost record, so without it a closed ticket reads as locked.
 */
export function ticketEditable(ticket: Pick<RepairTicket, 'status' | 'isUnlocked'>) {
  return !isClosed(ticket) || ticket.isUnlocked === true;
}

/** AC-3: an edit on an unlocked closed ticket says why. */
export function editNeedsReason(ticket: Pick<RepairTicket, 'status'>) {
  return isClosed(ticket);
}

/** The reason field every edit dialog shares; only checked when the ticket needs one. */
export function reasonField(needed: boolean) {
  const text = z.string();
  if (!needed) return text;
  return text.refine((value) => {
    const length = value.trim().length;
    return length >= EDIT_REASON_MIN && length <= EDIT_REASON_MAX;
  }, `Say why, in ${EDIT_REASON_MIN} to ${EDIT_REASON_MAX} characters.`);
}

// ── Details (AC-4 to AC-8) ────────────────────────────────────────────────────

export type DetailsFormValues = {
  priority: PriorityLevel;
  reason: string;
};

export function detailsSchema(needsReason: boolean) {
  return z.object({
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    reason: reasonField(needsReason),
  });
}

export function detailsDefaults(ticket: Pick<RepairTicket, 'priority'>): DetailsFormValues {
  return { priority: ticket.priority ?? 'MEDIUM', reason: '' };
}

/**
 * The body for PATCH /details: only the fields that differ from the ticket as it opened, so a
 * save never writes back a value someone else changed. Null when nothing changed.
 */
export function detailsPayload(
  values: DetailsFormValues,
  ticket: Pick<RepairTicket, 'priority' | 'status'>,
  lastUpdatedAt: string,
): EditDetailsPayload | null {
  const payload: EditDetailsPayload = { lastUpdatedAt };
  if (values.priority !== ticket.priority) payload.priority = values.priority;
  if (Object.keys(payload).length === 1) return null;
  if (editNeedsReason(ticket)) payload.reason = values.reason.trim();
  return payload;
}
