import { describe, expect, it } from 'vitest';
import { FINISHED_STATUSES, OPEN_STATUSES, REPAIR_STATUSES, isFinishedStatus } from './repairStatus';

// Spec 0010, AC-4a and AC-2: one definition of open and finished, matching the backend.

describe('repair statuses', () => {
  it('has exactly the nine v2 statuses (AC-2)', () => {
    expect([...REPAIR_STATUSES].sort()).toEqual(
      ['ASSIGNED', 'CANCELLED', 'CLOSED', 'FOR_VERIFICATION', 'IN_PROGRESS', 'ON_HOLD', 'OPEN', 'OUTSOURCED', 'PENDING_APPROVAL'].sort(),
    );
  });

  it('finished is closed and cancelled only', () => {
    expect(FINISHED_STATUSES).toEqual(['CLOSED', 'CANCELLED']);
  });

  it('open and finished split every status with no overlap (AC-4a)', () => {
    expect([...OPEN_STATUSES, ...FINISHED_STATUSES].sort()).toEqual([...REPAIR_STATUSES].sort());
    expect(OPEN_STATUSES.some((s) => FINISHED_STATUSES.includes(s))).toBe(false);
  });

  it('keeps ON_HOLD, OUTSOURCED and PENDING_APPROVAL open', () => {
    expect(OPEN_STATUSES).toEqual(expect.arrayContaining(['ON_HOLD', 'OUTSOURCED', 'PENDING_APPROVAL']));
  });

  it('isFinishedStatus agrees with the lists', () => {
    for (const status of REPAIR_STATUSES) {
      expect(isFinishedStatus(status)).toBe(!OPEN_STATUSES.includes(status));
    }
  });
});
