import type { Control } from 'react-hook-form';
import { z } from 'zod';
import type { CreateRepairPayload } from '../../../types';

// The repair form's one schema (spec 0005). Limits match create-repair.dto.ts.

/** The common issue picker's "Other (describe it yourself)" (spec 0007, AC-24). */
export const OTHER_ISSUE = '__other_issue__';
export const MAX_ISSUES = 10;
export const DESCRIPTION_LIMIT = 500;
/** The description counter turns red above this. */
export const DESCRIPTION_WARN_AT = 450;
export const NAME_LIMIT = 100;

/**
 * The loaded server lists the form checks its picks against. `null` skips the
 * check: the list has not loaded, or its last load failed (AC-20).
 */
export interface RepairFormLists {
  vehiclePlates: string[] | null;
  garageNames: string[] | null;
  /** In house mechanic ids (spec 0009, AC-27). */
  mechanicIds: string[] | null;
}

export const UNDER_REPAIR_WARNING =
  'This vehicle already has a repair in progress. Check its open tickets before adding another.';

export const sameName =(a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const ODOMETER_PATTERN = /^\d{1,7}$/;

/** A required pick that must still be in its loaded list. One message at a time. */
function pickFromList(requiredMessage: string, list: string[] | null, staleMessage: string) {
  return z.string().superRefine((value, ctx) => {
    if (!value) ctx.addIssue({ code: 'custom', message: requiredMessage });
    else if (list && !list.includes(value)) ctx.addIssue({ code: 'custom', message: staleMessage });
  });
}

const issueSchema = z.object({
  /** The picked common issue (spec 0007, AC-24); '' for none or Other. */
  knowledgeEntryId: z.string(),
  /** An active category id, shown as System. */
  categoryId: z.string().min(1, 'Choose a system.'),
  rootCause: z.string().min(1, 'Choose a root cause.'),
  description: z
    .string()
    .trim()
    .min(1, 'Describe the issue.')
    .max(DESCRIPTION_LIMIT, 'Keep it to 500 characters.'),
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
      driverName: z
        .string()
        .trim()
        .min(1, 'Choose or add a driver.')
        .max(NAME_LIMIT, 'Driver name must be 100 characters or fewer.'),
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
        if (mechanics.length === 0) {
          ctx.addIssue({ code: 'custom', message: 'Assign at least one mechanic.' });
          return;
        }
        const ids = lists.mechanicIds;
        if (!ids) return;
        mechanics.forEach((mechanic, index) => {
          if (!ids.includes(mechanic.id)) {
            ctx.addIssue({ code: 'custom', path: [index], message: `${mechanic.name} is no longer available.` });
          }
        });
      }),
      accountType: z.enum(['ONLINE', 'CORPORATE']),
      corporation: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.accountType === 'CORPORATE' && !values.corporation) {
        ctx.addIssue({ code: 'custom', path: ['corporation'], message: 'Choose a corporation.' });
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
  driverName: '',
  garageLocation: '',
  odometerReading: '',
  issues: [emptyIssue()],
  priority: 'MEDIUM',
  mechanics: [],
  accountType: 'ONLINE',
  corporation: '',
};

/** AC-18: no repairNumber (the server makes it), and the first issue as issueDescription. */
export function toCreatePayload(values: RepairFormValues): CreateRepairPayload {
  return {
    vehiclePlate: values.vehiclePlate,
    driverName: values.driverName,
    issueDescription: values.issues[0].description,
    accountType: values.accountType,
    corporation: values.accountType === 'CORPORATE' ? values.corporation : undefined,
    garageLocation: values.garageLocation,
    odometerReading: values.odometerReading,
    mechanics: values.mechanics.map(({ id }) => ({ id })),
    priority: values.priority,
    issues: values.issues.map(({ knowledgeEntryId, categoryId, rootCause, description }) => ({
      categoryId,
      rootCause,
      description,
      ...(knowledgeEntryId && knowledgeEntryId !== OTHER_ISSUE ? { knowledgeEntryId } : {}),
    })),
  };
}
