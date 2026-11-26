import { describe, expect, it } from 'vitest';
import { chipCounts, filterVehicles, lastSynced, makeAndModel, readStatusChip } from './vehicleStatus';

// Spec 0020, AC-12, and spec 0029, AC-4: the read only Vehicles list's chips and search. The
// statuses are VMMS's; Disabled is gone.

const truck = (plateNumber: string, status: string, extra: { size?: string; garage?: string; make?: string } = {}) => ({
  plateNumber,
  model: 'Elf',
  make: extra.make ?? null,
  truckSizeCategory: extra.size ?? null,
  garage: extra.garage ? { id: extra.garage, name: extra.garage } : null,
  status,
});

const FLEET = [
  truck('ABC 123', 'AVAILABLE', { size: '6 wheeler', make: 'Isuzu' }),
  truck('ABD 456', 'UNDER_MAINTENANCE', { garage: 'Valenzuela' }),
  truck('XYZ 789', 'UNDER_REPAIR'),
  truck('ABE 000', 'AVAILABLE'),
];

describe('status chips (AC-12)', () => {
  it('reads a known status param and falls back to All for anything else, Disabled included', () => {
    expect(readStatusChip('UNDER_MAINTENANCE')).toBe('UNDER_MAINTENANCE');
    expect(readStatusChip('UNDER_REPAIR')).toBe('UNDER_REPAIR');
    for (const param of [null, '', 'bogus', 'ALL', 'DISABLED', 'available']) {
      expect(readStatusChip(param)).toBe('ALL');
    }
  });

  it('needs both the chip and the search, which reads plate, make, model, size and garage', () => {
    const plates = (chip: Parameters<typeof filterVehicles>[1], needle: string) =>
      filterVehicles(FLEET, chip, needle).map((v) => v.plateNumber);
    expect(plates('UNDER_MAINTENANCE', 'ab')).toEqual(['ABD 456']);
    expect(plates('UNDER_MAINTENANCE', 'xyz')).toEqual([]);
    expect(plates('ALL', '6 wheeler')).toEqual(['ABC 123']);
    expect(plates('ALL', 'isuzu')).toEqual(['ABC 123']);
    expect(plates('ALL', 'valenzuela')).toEqual(['ABD 456']);
    expect(plates('ALL', '')).toHaveLength(4);
  });

  it('counts each chip under the current search', () => {
    expect(chipCounts(FLEET, '')).toEqual({ ALL: 4, AVAILABLE: 2, UNDER_REPAIR: 1, UNDER_MAINTENANCE: 1 });
    expect(chipCounts(FLEET, 'ab')).toEqual({ ALL: 3, AVAILABLE: 2, UNDER_REPAIR: 0, UNDER_MAINTENANCE: 1 });
  });
});

describe('lastSynced (spec 0029, AC-4)', () => {
  it('is the newest syncedAt, and null before the first sync', () => {
    expect(lastSynced([{ syncedAt: null }])).toBeNull();
    expect(
      lastSynced([{ syncedAt: '2026-11-27T01:00:00.000Z' }, { syncedAt: null }, { syncedAt: '2026-11-27T03:00:00.000Z' }]),
    ).toBe('2026-11-27T03:00:00.000Z');
  });
});

describe('makeAndModel', () => {
  it('never repeats a make the model already starts with', () => {
    expect(makeAndModel({ make: 'Mitsubishi', model: 'Mitsubishi Fuso FE' })).toBe('Mitsubishi Fuso FE');
    expect(makeAndModel({ make: 'Isuzu', model: 'Elf NKR' })).toBe('Isuzu Elf NKR');
    expect(makeAndModel({ make: null, model: 'Elf' })).toBe('Elf');
  });
});
