export interface AuditEntry {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}

export const SAMPLE_AUDITS: AuditEntry[] = [
  { id: 'a1', user: 'admin', action: 'Marked VRMS-0011 as COMPLETED', timestamp: '2026-06-01T12:30:00.000Z' },
  { id: 'a2', user: 'ops', action: 'Created VRMS-0014', timestamp: '2026-06-03T08:05:00.000Z' },
  { id: 'a3', user: 'admin', action: 'Updated cost for VRMS-0012', timestamp: '2026-06-03T09:45:00.000Z' },
  { id: 'a4', user: 'mechanic1', action: 'Changed status VRMS-0015 to IN_PROGRESS', timestamp: '2026-06-04T09:10:00.000Z' },
  { id: 'a5', user: 'admin', action: 'Cancelled VRMS-0010', timestamp: '2026-05-30T16:45:00.000Z' },
];

export const REPORT_STATS = {
  audits: SAMPLE_AUDITS.length,
  lastAudit: SAMPLE_AUDITS[0]?.timestamp || null,
  monthlyRepairs: 128,
  monthlyCost: 124500,
};
