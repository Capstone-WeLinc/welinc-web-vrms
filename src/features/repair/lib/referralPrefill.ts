import type { ReferralDetail, ReferralFinding } from '../../../lib/api/referralsApi';
import { DESCRIPTION_LIMIT, REPAIR_FORM_DEFAULTS, type RepairFormInput } from './repairFormSchema';

// Spec 0029 (child 0002), AC-8: the new ticket form filled from a VMMS referral. The truck, its
// garage, the odometer and one issue line per finding; the system and root cause stay for the
// Admin, and no driver is needed.

/** "Label: note", or the label alone, cut to the description limit. */
export function findingDescription(finding: ReferralFinding): string {
  const text = finding.note ? `${finding.label}: ${finding.note}` : finding.label;
  return text.length > DESCRIPTION_LIMIT ? text.slice(0, DESCRIPTION_LIMIT) : text;
}

export function referralFormValues(referral: ReferralDetail): RepairFormInput {
  return {
    ...REPAIR_FORM_DEFAULTS,
    vehiclePlate: referral.vehicle.plateNumber,
    // No garage on the truck: the field stays empty and required as usual
    garageLocation: referral.vehicle.garage?.name ?? '',
    odometerReading: String(referral.odometerReading),
    issues: referral.findings.map((finding) => ({
      knowledgeEntryId: '',
      categoryId: '',
      rootCause: '',
      description: findingDescription(finding),
    })),
  };
}

/** Why the form can't open a ticket from this referral, or null when it can. */
export function referralBlocker(referral: ReferralDetail): string | null {
  if (referral.status !== 'WAITING') return 'This referral was already handled.';
  if (referral.vehicle.openTicket) {
    return `This truck already has an open ticket, ${referral.vehicle.openTicket.repairNumber}. Add the findings there instead.`;
  }
  if (!referral.vehicle.isActive) return 'This truck was removed in VMMS.';
  return null;
}
