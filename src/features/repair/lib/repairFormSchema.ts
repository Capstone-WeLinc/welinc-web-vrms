import type { Control } from 'react-hook-form';
import { z } from 'zod';
import type { CreateRepairPayload } from '../../../types';

// The repair form's one schema (spec 0005, reworked by spec 0016). Limits match create-repair.dto.ts.

/** The common issue picker's "Other (describe it yourself)" (spec 0007, AC-24). */
export const OTHER_ISSUE = '__other_issue__';
export const MAX_ISSUES = 10;
export const DESCRIPTION_LIMIT = 500;
/** The description counter turns red above this. */
export const DESCRIPTION_WARN_AT = 450;
export const NAME_LIMIT = 100;

/** An LTO driver's license number, such as A01-23-456789 (spec 0016, AC-6). */
export const LICENSE_PATTERN = /^[A-Z]\d{2}-\d{2}-\d{6}$/;
export const LICENSE_FORMAT_MESSAGE = 'Use the format A01-23-456789.';

/**
 * The loaded server lists the form checks its picks against. `null` skips the
 * check: the list has not loaded, or its last load failed (AC-20).
 */
export interface RepairFormLists {
  vehiclePlates: string[] | null;
  garageNames: string[] | null;
  /** In house mechanic ids (spec 0009, AC-27). */
  mechanicIds: string[] | null;
  /** Active ids of the corporation list (spec 0016, AC-4). */
  corporationIds: string[] | null;
}

export const UNDER_REPAIR_WARNING =
  'This vehicle already has a repair in progress. Check its open tickets before adding another.';

const ODOMETER_PATTERN = /^\d{1,7}$/;

/** A required pick that must still be in its loaded list. One message at a time. */
function pickFromList(requiredMessage: string, list: string[] | null, staleMessage: string) {
  return z.string().superRefine((value, ctx) => {
    if (!value) ctx.addIssue({ code: 'custom', message: requiredMessage });
    else if (list && !list.includes(value)) ctx.addIssue({ code: 'custom', message: staleMessage });
  });
}

const issueSchema = z
  .object({
    /** The picked common issue (spec 0007, AC-24); '' for none or Other. */
    knowledgeEntryId: z.string(),
    /** An active category id, shown as System. */
    categoryId: z.string().min(1, 'Choose a system.'),
    rootCause: z.string().min(1, 'Choose a root cause.'),
    description: z.string().trim().max(DESCRIPTION_LIMIT, 'Keep it to 500 characters.'),
  })
  .superRefine((issue, ctx) => {
    // Blank is fine only with a picked common issue: the server then uses its name (spec 0016, AC-5)
    const linked = !!issue.knowledgeEntryId && issue.knowledgeEntryId !== OTHER_ISSUE;
    if (!issue.description && !linked) {
      ctx.addIssue({ code: 'custom', path: ['description'], message: 'Describe the issue.' });
    }
  });

/** An in house mechanic chip, by Mechanic id (spec 0009, AC-27). Outsourced shops return with feature 36. */
const mechanicSchema = z.object({
  id: z.string(),
  name: z.string(),
});

/** Built per validation, so "still in its list" always reads the current lists. */
export function buildRepairFormSchema(lists: RepairFormLists) {
  return z
    .object({
      vehiclePlate: pickFromList(
        'Choose a vehicle.',
        lists.vehiclePlates,
        'This vehicle is no longer available. Choose another.',
      ),
      /** True while the Add new driver fields are showing instead of the picker (spec 0016, AC-13). */
      addingDriver: z.boolean(),
      /** The picked existing driver, with the name shown in the picker. */
      driverId: z.string(),
      driverLabel: z.string(),
      newDriverName: z.string(),
      newDriverLicense: z.string(),
      garageLocation: pickFromList(
        'Choose a garage.',
        lists.garageNames,
        'This garage is no longer available. Choose another.',
      ),
      odometerReading: z
        .string()
        .trim()
        .superRefine((value, ctx) => {
          if (!value) ctx.addIssue({ code: 'custom', message: 'Enter the odometer reading.' });
          else if (!ODOMETER_PATTERN.test(value)) {
            ctx.addIssue({ code: 'custom', message: 'Use a whole number of kilometers, up to 9,999,999.' });
          }
        })
        .transform(Number),
      issues: z.array(issueSchema).min(1).max(MAX_ISSUES),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      mechanics: z.array(mechanicSchema).superRefine((mechanics, ctx) => {
        // Optional (spec 0016, AC-15): none means the ticket starts Open
        const ids = lists.mechanicIds;
        if (!ids) return;
        mechanics.forEach((mechanic, index) => {
          if (!ids.includes(mechanic.id)) {
            ctx.addIssue({ code: 'custom', path: [index], message: `${mechanic.name} is no longer available.` });
          }
        });
      }),
      accountType: z.enum(['ONLINE', 'CORPORATE']),
      corporationId: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.accountType === 'CORPORATE') {
        if (!values.corporationId) {
          ctx.addIssue({ code: 'custom', path: ['corporationId'], message: 'Choose a corporation.' });
        } else if (lists.corporationIds && !lists.corporationIds.includes(values.corporationId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['corporationId'],
            message: 'This corporation is no longer available. Choose another.',
          });
        }
      }
      if (values.addingDriver) {
        const name = values.newDriverName.trim();
        if (!name) {
          ctx.addIssue({ code: 'custom', path: ['newDriverName'], message: 'Enter the driver’s name.' });
        } else if (name.length > NAME_LIMIT) {
          ctx.addIssue({ code: 'custom', path: ['newDriverName'], message: 'Driver name must be 100 characters or fewer.' });
        }
        const license = values.newDriverLicense.trim().toUpperCase();
        if (!license) {
          ctx.addIssue({ code: 'custom', path: ['newDriverLicense'], message: 'Enter the license number.' });
        } else if (!LICENSE_PATTERN.test(license)) {
          ctx.addIssue({ code: 'custom', path: ['newDriverLicense'], message: LICENSE_FORMAT_MESSAGE });
        }
      } else if (!values.driverId) {
        ctx.addIssue({ code: 'custom', path: ['driverId'], message: 'Choose or add a driver.' });
      }
    }, { when: () => true });
  // `when` runs the conditional rules even while other fields are invalid, so an empty submit shows every error (AC-3).
}

type RepairFormSchema = ReturnType<typeof buildRepairFormSchema>;
/** What the form holds (the odometer is text). */
export type RepairFormInput = z.input<RepairFormSchema>;
/** What a valid submit hands over (trimmed, the odometer a number). */
export type RepairFormValues = z.output<RepairFormSchema>;
export type RepairFormControl = Control<RepairFormInput, unknown, RepairFormValues>;

export function emptyIssue(): RepairFormInput['issues'][number] {
  return { knowledgeEntryId: '', categoryId: '', rootCause: '', description: '' };
}

export const REPAIR_FORM_DEFAULTS: RepairFormInput = {
  vehiclePlate: '',
  addingDriver: false,
  driverId: '',
  driverLabel: '',
  newDriverName: '',
  newDriverLicense: '',
  garageLocation: '',
  odometerReading: '',
  issues: [emptyIssue()],
  priority: 'MEDIUM',
  mechanics: [],
  accountType: 'ONLINE',
  corporationId: '',
};

/** Extra flags the summary dialog sets (spec 0016, AC-7). */
export interface CreateExtras {
  confirmOdometerJump?: boolean;
}

/** AC-18: no repairNumber (the server makes it). The driver goes as an id or a new driver, never both. */
export function toCreatePayload(values: RepairFormValues, extras: CreateExtras = {}): CreateRepairPayload {
  return {
    vehiclePlate: values.vehiclePlate,
    ...(values.addingDriver
      ? {
          newDriver: {
            name: values.newDriverName.trim(),
            licenseNumber: values.newDriverLicense.trim().toUpperCase(),
          },
        }
      : { driverId: values.driverId }),
    accountType: values.accountType,
    corporationId: values.accountType === 'CORPORATE' ? values.corporationId : undefined,
    garageLocation: values.garageLocation,
    odometerReading: values.odometerReading,
    ...(extras.confirmOdometerJump && { confirmOdometerJump: true }),
    mechanics: values.mechanics.map(({ id }) => ({ id })),
    priority: values.priority,
    issues: values.issues.map(({ knowledgeEntryId, categoryId, rootCause, description }) => ({
      categoryId,
      rootCause,
      ...(description ? { description } : {}),
      ...(knowledgeEntryId && knowledgeEntryId !== OTHER_ISSUE ? { knowledgeEntryId } : {}),
    })),
  };
}
