import type { LeaveReason } from '../../../lib/api/vrmsConfigApi';
import { timeInStatus } from './attention';

const REASON_TEXT: Record<LeaveReason, string> = {
  DELETED: 'account deleted',
  DEACTIVATED: 'account deactivated',
  ROLE_REMOVED: 'VRMS role removed',
};

/** Suite spec 0013, AC-32: who left and why, as one line ("Ana Cruz, account deleted"). */
export function leaverLine(person: string | null, reason: LeaveReason | null) {
  const who = person?.trim() || 'A former mechanic';
  return reason ? `${who}, ${REASON_TEXT[reason]}` : `${who} left VRMS`;
}

/** When the release happened, measured to the dashboard's fetch time ("3 h ago", "2 days ago"). */
export function releasedAgo(releasedAt: string, now: number) {
  const span = timeInStatus(releasedAt, now);
  return span === 'time unknown' ? span : `${span} ago`;
}
