import type { RepairTicket } from '../types';

/** A minimal ticket for logic tests; override only what the test is about. */
export function ticket(overrides: Partial<RepairTicket> = {}): RepairTicket {
  return {
    id: 't1',
    repairNumber: 'REP-20261029-AAAA',
    vehiclePlate: 'ABC 123',
    driverName: 'Driver',
    issueDescription: 'Noise',
    status: 'ASSIGNED',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    statusChangedAt: '2026-10-01T00:00:00.000Z',
    can: { work: false, administer: false, verify: false, editCosts: false, unlock: false, assign: false, edit: false, editChecklist: false, editDueDate: false },
    ...overrides,
  };
}
