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

describe('describeChange for fleet sync rows (spec 0029, AC-3)', () => {
  const sync = (field: string, before: unknown, after: unknown) =>
    describeChange({ id: 's', field, before, after, note: null, actorName: 'VMMS', createdAt: '2026-11-27T00:00:00.000Z', ticket: null });

  it('names VMMS and never says Ticket removed on a status row', () => {
    expect(sync('status', 'AVAILABLE', 'UNDER_MAINTENANCE')).toEqual({
      what: 'Status',
      before: 'Available',
      after: 'Under maintenance',
      who: 'VMMS',
      detail: null,
    });
  });

  it('words each copied field', () => {
    expect(sync('plateNumber', 'ABC 123', 'ABC 124')).toMatchObject({ what: 'Plate', before: 'ABC 123', after: 'ABC 124' });
    expect(sync('garage', null, { id: 'g', name: 'Pasig' })).toMatchObject({ what: 'Garage', before: 'Not set', after: 'Pasig' });
    expect(sync('capacity', 4000, 12500)).toMatchObject({ what: 'Capacity', before: '4,000 kg', after: '12,500 kg' });
    expect(sync('truckSizeCategory', '6 wheeler', null)).toMatchObject({ what: 'Size', before: '6 wheeler', after: 'Not set' });
    expect(sync('isActive', true, false)).toMatchObject({ what: 'In VMMS', before: 'In the fleet', after: 'Removed in VMMS' });
  });
});
