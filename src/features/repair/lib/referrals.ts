import type { ReferralStatus } from '../../../lib/api/referralsApi';

// Spec 0029, AC-7: the Referrals tab's fixed words.

export const REFERRAL_STATUSES: ReferralStatus[] = ['WAITING', 'OPENED_TICKET', 'ADDED_TO_TICKET', 'REJECTED'];

export const REFERRAL_STATUS_LABEL: Record<ReferralStatus, string> = {
  WAITING: 'Waiting',
  OPENED_TICKET: 'Ticket opened',
  ADDED_TO_TICKET: 'Added to ticket',
  REJECTED: 'Rejected',
};

/** The tab is a view of the Repairs page: `?view=referrals`. */
export type RepairsView = 'tickets' | 'referrals';

export function repairsView(raw: string | null, canRespond: boolean): RepairsView {
  return raw === 'referrals' && canRespond ? 'referrals' : 'tickets';
}

export function referralStatusParam(raw: string | null): ReferralStatus {
  return REFERRAL_STATUSES.includes(raw as ReferralStatus) ? (raw as ReferralStatus) : 'WAITING';
}
