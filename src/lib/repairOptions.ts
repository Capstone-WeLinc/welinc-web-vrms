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

const ROOT_CAUSE_OPTIONS = [
  'Wear and tear',
  'Hydraulic leak',
  'Electrical fault',
  'Overheating',
  'Impact damage',
  'Unknown',
];

export interface RepairFormOptions {
  rootCauses: readonly string[];
}

const REPAIR_FORM_OPTIONS: RepairFormOptions = {
  rootCauses: ROOT_CAUSE_OPTIONS,
};

export function getRepairFormOptions(): RepairFormOptions {
  return REPAIR_FORM_OPTIONS;
}
