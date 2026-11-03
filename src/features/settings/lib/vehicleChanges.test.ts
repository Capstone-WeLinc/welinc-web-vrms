import { describe, expect, it } from 'vitest';
import type { VehicleChange } from '../../../lib/api/vehiclesApi';
import { describeChange } from './vehicleChanges';

// Spec 0020, AC-13: History entries in plain words.
const row = (over: Partial<VehicleChange>): VehicleChange => ({
  id: 'c1',
  field: 'status',
  before: 'AVAILABLE',
  after: 'DISABLED',
  note: null,
  actorName: 'Victor Ramos',
  createdAt: '2026-11-03T01:00:00.000Z',
  ticket: null,
  ...over,
});

describe('describeChange', () => {
  it('words a manual status change with its reason', () => {
    expect(describeChange(row({ note: 'Engine seized' }))).toEqual({
      what: 'Status',
      before: 'Available',
      after: 'Disabled',
      who: 'Victor Ramos',
      detail: { kind: 'reason', text: 'Engine seized' },
    });
  });

  it('links an automatic status change to its ticket', () => {
    const ticket = { id: 't1', repairNumber: 'R-0123' };
    const entry = describeChange(row({ before: 'DISABLED', after: 'UNDER_REPAIR', ticket }));
    expect(entry.after).toBe('Under repair');
    expect(entry.detail).toEqual({ kind: 'ticket', ticket });
  });

  it('says Ticket removed on a status row with neither a reason nor a ticket', () => {
    expect(describeChange(row({})).detail).toEqual({ kind: 'removed' });
  });

  it('words a type change by name, with Not set for null, and never says Ticket removed', () => {
    const entry = describeChange(row({ field: 'vehicleType', before: null, after: { id: 'x', name: 'Rigid' } }));
    expect(entry).toMatchObject({ what: 'Type', before: 'Not set', after: 'Rigid', detail: null });
  });

  it('names System when the actor is unknown', () => {
    expect(describeChange(row({ actorName: null })).who).toBe('System');
    expect(describeChange(row({ actorName: '  ' })).who).toBe('System');
  });
});
