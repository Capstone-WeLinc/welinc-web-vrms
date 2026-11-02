import { z } from 'zod';
import type { EditDetailsPayload } from '../../../lib/api/repairApi';
import type { LookupOption } from '../../../lib/api/vrmsConfigApi';
import type { AccountType, PriorityLevel, RepairTicket } from '../../../types';
import { isClosed } from './nextAction';
import { LICENSE_FORMAT_MESSAGE, LICENSE_PATTERN, NAME_LIMIT } from './repairFormSchema';

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
  /** AC-4: true while the Name and License number fields for a new driver are open. */
  addingDriver: boolean;
  driverId: string;
  driverLabel: string;
  newDriverName: string;
  newDriverLicense: string;
  /** Text in the form, a whole number in the payload. */
  odometer: string;
  priority: PriorityLevel;
  accountType: AccountType | '';
  corporationId: string;
  reason: string;
};

type DetailsTicket = Pick<
  RepairTicket,
  'priority' | 'status' | 'driverId' | 'driverName' | 'odometerReading' | 'accountType' | 'corporation'
>;

/**
 * The corporation picked at open: the active lookup value with the ticket's stored name, else none
 * (renamed or switched off since). The stored name is a snapshot (spec 0016, AC-4).
 */
export function openedCorporationId(ticket: Pick<RepairTicket, 'corporation'>, corporations: readonly LookupOption[]) {
  return corporations.find((c) => c.name === ticket.corporation)?.id ?? '';
}

export function detailsDefaults(ticket: DetailsTicket, corporationId = ''): DetailsFormValues {
  return {
    addingDriver: false,
    driverId: ticket.driverId ?? '',
    driverLabel: ticket.driverName,
    newDriverName: '',
    newDriverLicense: '',
    odometer: ticket.odometerReading != null ? String(ticket.odometerReading) : '',
    priority: ticket.priority ?? 'MEDIUM',
    accountType: ticket.accountType ?? '',
    corporationId,
    reason: '',
  };
}

/** Whether the account part changed from how the dialog opened (AC-7). */
function accountChanged(values: DetailsFormValues, opened: DetailsFormValues) {
  if (values.accountType !== opened.accountType) return true;
  return values.accountType === 'CORPORATE' && !!values.corporationId && values.corporationId !== opened.corporationId;
}

/** `openedAccount` is the ticket's account type as the dialog opened. */
export function detailsSchema(needsReason: boolean, openedAccount: DetailsFormValues['accountType']) {
  return z
    .object({
      addingDriver: z.boolean(),
      driverId: z.string(),
      driverLabel: z.string(),
      newDriverName: z.string(),
      newDriverLicense: z.string(),
      odometer: z
        .string()
        .trim()
        .min(1, 'Enter the odometer reading.')
        .refine((v) => /^\d+$/.test(v) && Number.isSafeInteger(Number(v)), 'Enter whole kilometers, for example 120400.'),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      accountType: z.enum(['ONLINE', 'CORPORATE', '']),
      corporationId: z.string(),
      reason: reasonField(needsReason),
    })
    .superRefine((v, ctx) => {
      if (v.addingDriver) {
        if (!v.newDriverName.trim()) ctx.addIssue({ code: 'custom', path: ['newDriverName'], message: 'Enter the driver’s name.' });
        else if (v.newDriverName.trim().length > NAME_LIMIT) {
          ctx.addIssue({ code: 'custom', path: ['newDriverName'], message: `Keep it to ${NAME_LIMIT} characters.` });
        }
        const license = v.newDriverLicense.trim().toUpperCase();
        if (!license) ctx.addIssue({ code: 'custom', path: ['newDriverLicense'], message: 'Enter the license number.' });
        else if (!LICENSE_PATTERN.test(license)) ctx.addIssue({ code: 'custom', path: ['newDriverLicense'], message: LICENSE_FORMAT_MESSAGE });
      } else if (!v.driverId) {
        ctx.addIssue({ code: 'custom', path: ['driverId'], message: 'Choose or add a driver.' });
      }
      // AC-7: switching to Corporate needs a corporation. A ticket that was Corporate keeps its
      // stored one unless another is picked.
      if (v.accountType === 'CORPORATE' && !v.corporationId && openedAccount !== 'CORPORATE') {
        ctx.addIssue({ code: 'custom', path: ['corporationId'], message: 'Choose a corporation.' });
      }
    });
}

/**
 * The body for PATCH /details: only the fields that differ from how the dialog opened, so a save
 * never writes back a value someone else changed. Null when nothing changed (AC-8b).
 */
export function detailsPayload(
  values: DetailsFormValues,
  opened: DetailsFormValues,
  ticket: Pick<RepairTicket, 'status'>,
  lastUpdatedAt: string,
  confirmOdometerJump = false,
): EditDetailsPayload | null {
  const payload: EditDetailsPayload = { lastUpdatedAt };
  if (values.addingDriver) {
    payload.newDriver = { name: values.newDriverName.trim(), licenseNumber: values.newDriverLicense.trim().toUpperCase() };
  } else if (values.driverId && values.driverId !== opened.driverId) {
    payload.driverId = values.driverId;
  }
  const odometer = Number(values.odometer.trim());
  if (values.odometer.trim() !== opened.odometer) {
    payload.odometerReading = odometer;
    if (confirmOdometerJump) payload.confirmOdometerJump = true;
  }
  if (values.priority !== opened.priority) payload.priority = values.priority;
  if (values.accountType && accountChanged(values, opened)) {
    payload.accountType = values.accountType;
    if (values.accountType === 'CORPORATE') payload.corporationId = values.corporationId;
  }
  if (Object.keys(payload).length === 1) return null;
  if (editNeedsReason(ticket)) payload.reason = values.reason.trim();
  return payload;
}
