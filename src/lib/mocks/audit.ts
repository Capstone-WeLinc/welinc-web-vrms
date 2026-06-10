/**
 * Mock data for system audit trail and reporting
 */
export interface AuditEntry {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}

export interface AlertNotification {
  id: string;
  type: 'PENDING_OVERDUE' | 'HIGH_PRIORITY' | 'DUE_DATE_EXCEEDED' | 'FREQUENT_REPAIRS';
  repairNumber?: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: string;
  isRead: boolean;
}

export const SAMPLE_AUDITS: AuditEntry[] = [
  { id: 'a1', user: 'admin', action: 'Marked REP-20260601-0011 as COMPLETED', timestamp: '2026-06-01T12:30:00.000Z' },
  { id: 'a2', user: 'ops', action: 'Created REP-20260603-0014', timestamp: '2026-06-03T08:05:00.000Z' },
  { id: 'a3', user: 'admin', action: 'Updated cost for REP-20260601-0012 to ₱950', timestamp: '2026-06-03T09:45:00.000Z' },
  { id: 'a4', user: 'mechanic_rommel', action: 'Changed status REP-20260604-0015 to IN_PROGRESS', timestamp: '2026-06-04T09:10:00.000Z' },
  { id: 'a5', user: 'admin', action: 'Cancelled REP-20260528-0010 - Reason: Customer opted for third-party diagnostics', timestamp: '2026-05-30T16:45:00.000Z' },
  { id: 'a6', user: 'ops', action: 'Assigned mechanic Rommel Cruz to REP-20260601-0012', timestamp: '2026-06-01T08:15:00.000Z' },
  { id: 'a7', user: 'admin', action: 'Updated shop name for REP-20260604-0015 to ProFix Auto Shop', timestamp: '2026-06-04T08:20:00.000Z' },
  { id: 'a8', user: 'mechanic_isabel', action: 'Logged issue for REP-20260602-0013: Engine overheating', timestamp: '2026-06-02T10:30:00.000Z' },
  { id: 'a9', user: 'admin', action: 'Set target due date for REP-20260604-0015 to 2026-06-05T17:00:00', timestamp: '2026-06-04T08:25:00.000Z' },
  { id: 'a10', user: 'admin', action: 'Added remarks: Mechanic on-site, brake pads replaced. Waiting for system pressure test.', timestamp: '2026-06-03T09:50:00.000Z' },
];

export const ACTIVE_ALERTS: AlertNotification[] = [
  {
    id: 'alert-1',
    type: 'DUE_DATE_EXCEEDED',
    repairNumber: 'REP-20260604-0015',
    message: 'Repair REP-20260604-0015 (SL 9999) has exceeded target due date. Expected completion: 2026-06-05 5:00 PM',
    severity: 'CRITICAL',
    timestamp: '2026-06-05T18:00:00.000Z',
    isRead: false,
  },
  {
    id: 'alert-2',
    type: 'PENDING_OVERDUE',
    repairNumber: 'REP-20260603-0014',
    message: 'Repair REP-20260603-0014 (SL 1256) has been in Pending status for 2 days. Assign mechanic soon.',
    severity: 'MEDIUM',
    timestamp: '2026-06-05T08:00:00.000Z',
    isRead: false,
  },
  {
    id: 'alert-3',
    type: 'HIGH_PRIORITY',
    repairNumber: 'REP-20260604-0015',
    message: 'High priority repair REP-20260604-0015 has been in In Progress for 21 hours. Ensure timely completion.',
    severity: 'HIGH',
    timestamp: '2026-06-05T05:00:00.000Z',
    isRead: true,
  },
  {
    id: 'alert-4',
    type: 'FREQUENT_REPAIRS',
    message: 'Vehicle SL 1920 has had 7 repairs in the past 30 days. Consider for preventive maintenance review.',
    severity: 'MEDIUM',
    timestamp: '2026-06-05T10:00:00.000Z',
    isRead: false,
  },
];

export const REPORT_STATS = {
  audits: SAMPLE_AUDITS.length,
  lastAudit: SAMPLE_AUDITS[0]?.timestamp || null,
  monthlyRepairs: 128,
  monthlyCost: 124500,
};
