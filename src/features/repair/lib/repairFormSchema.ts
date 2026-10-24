import type { Control } from 'react-hook-form';
import { z } from 'zod';
import type { CreateRepairPayload } from '../../../types';

// The repair form's one schema (spec 0005). Limits match create-repair.dto.ts.

/** The Repair shop value for "Other"; no real shop is named this. */
export const OTHER_SHOP = '__other__';
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
  mechanicNames: string[] | null;
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
  vehicleSystem: z.string().min(1, 'Choose a system.'),
  rootCause: z.string().min(1, 'Choose a root cause.'),
  description: z
    .string()
    .trim()
    .min(1, 'Describe the issue.')
    .max(DESCRIPTION_LIMIT, 'Keep it to 500 characters.'),
});

const mechanicSchema = z.object({
  name: z.string(),
  isOutsourced: z.boolean(),
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
        const names = lists.mechanicNames;
        if (!names) return;
        mechanics.forEach((mechanic, index) => {
          if (!mechanic.isOutsourced && !names.includes(mechanic.name)) {
            ctx.addIssue({ code: 'custom', path: [index], message: `${mechanic.name} is no longer available.` });
          }
        });
      }),
      shopChoice: z.string().min(1, 'Choose a repair shop.'),
      otherShopName: z.string().trim(),
      accountType: z.enum(['ONLINE', 'CORPORATE']),
      corporation: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.shopChoice === OTHER_SHOP) {
        if (!values.otherShopName) {
          ctx.addIssue({ code: 'custom', path: ['otherShopName'], message: 'Enter the shop name.' });
        } else if (values.otherShopName.length > NAME_LIMIT) {
          ctx.addIssue({ code: 'custom', path: ['otherShopName'], message: 'Keep it to 100 characters.' });
        }
      }
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
  return { vehicleSystem: '', rootCause: '', description: '' };
}

export const REPAIR_FORM_DEFAULTS: RepairFormInput = {
  vehiclePlate: '',
  driverName: '',
  garageLocation: '',
  odometerReading: '',
  issues: [emptyIssue()],
  priority: 'MEDIUM',
  mechanics: [],
  shopChoice: '',
  otherShopName: '',
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
    mechanics: values.mechanics.map(({ name, isOutsourced }) =>
      isOutsourced ? { name: name.trim(), isOutsourced: true, shopName: name.trim() } : { name, isOutsourced: false },
    ),
    shopName: values.shopChoice === OTHER_SHOP ? values.otherShopName : values.shopChoice,
    priority: values.priority,
    issues: values.issues.map(({ vehicleSystem, rootCause, description }) => ({ vehicleSystem, rootCause, description })),
  };
}
