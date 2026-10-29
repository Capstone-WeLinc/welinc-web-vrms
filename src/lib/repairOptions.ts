// Fixed option lists for the repair form. The form reads the lists only through
// getRepairFormOptions(), so feature 40 can swap the source for Admin managed lists.

export const ACCOUNT_TYPE_OPTIONS = [
  { value: 'ONLINE', label: 'Online' },
  { value: 'CORPORATE', label: 'Corporate' },
] as const;

export const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
] as const;

const CORPORATION_OPTIONS = ['WeLinc Transport Corp', 'Metro Freight Corp', 'Global Logistics Inc'];

const ROOT_CAUSE_OPTIONS = [
  'Wear and tear',
  'Hydraulic leak',
  'Electrical fault',
  'Overheating',
  'Impact damage',
  'Unknown',
];

export interface RepairFormOptions {
  corporations: readonly string[];
  rootCauses: readonly string[];
}

const REPAIR_FORM_OPTIONS: RepairFormOptions = {
  corporations: CORPORATION_OPTIONS,
  rootCauses: ROOT_CAUSE_OPTIONS,
};

export function getRepairFormOptions(): RepairFormOptions {
  return REPAIR_FORM_OPTIONS;
}
