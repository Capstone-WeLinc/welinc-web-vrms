/** Spec 0029, AC-12: a ticket opened from a VMMS referral has no driver, and says so. */
export const NO_DRIVER_LABEL = 'None (from VMMS)';

/** The driver as a person reads it: the name, or the VMMS note when there is none. */
export function driverLabel(driverName: string | null | undefined): string {
  return driverName ?? NO_DRIVER_LABEL;
}
