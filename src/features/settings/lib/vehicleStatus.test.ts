import { describe, expect, it } from 'vitest';
import { blockedAction, chipCounts, filterVehicles, readStatusChip, statusActions, statusBlock } from './vehicleStatus';

const truck = (plateNumber: string, status: string, type: string | null = null) => ({
  plateNumber,
  model: 'Isuzu Elf',
  status,
  type: type ? { id: type, name: type } : null,
});

const FLEET = [
  truck('ABC 123', 'AVAILABLE', '6 wheeler'),
  truck('ABD 456', 'DISABLED'),
  truck('XYZ 789', 'UNDER_REPAIR'),
  truck('ABE 000', 'UNDER_MAINTENANCE'),
];

describe('statusBlock and blockedAction (AC-10)', () => {
  it('blocks a row with an open ticket and names the ticket', () => {
    const ticket = { id: 't1', repairNumber: 'R-0123' };
    expect(statusBlock({ status: 'UNDER_REPAIR', openTicket: ticket })).toEqual({ kind: 'ticket', ticket });
  });

  it('blocks Under maintenance even without a ticket, and leaves a stuck truck free', () => {
    expect(statusBlock({ status: 'UNDER_MAINTENANCE', openTicket: null })).toEqual({ kind: 'maintenance' });
    expect(statusBlock({ status: 'UNDER_REPAIR', openTicket: null })).toBeNull();
    expect(statusBlock({ status: 'AVAILABLE', openTicket: null })).toBeNull();
  });

  it('shows Make available on a blocked Disabled row and Disable truck otherwise', () => {
    expect(blockedAction({ status: 'DISABLED' }).label).toBe('Make available');
    expect(blockedAction({ status: 'UNDER_REPAIR' }).label).toBe('Disable truck');
  });
});

describe('status chips (AC-12)', () => {
  it('reads a known status param and falls back to All for anything else', () => {
    expect(readStatusChip('DISABLED')).toBe('DISABLED');
    expect(readStatusChip('UNDER_REPAIR')).toBe('UNDER_REPAIR');
    for (const param of [null, '', 'bogus', 'ALL', 'UNDER_MAINTENANCE', 'disabled']) {
      expect(readStatusChip(param)).toBe('ALL');
    }
  });

  it('needs both the chip and the search to match', () => {
    const plates = (chip: Parameters<typeof filterVehicles>[1], needle: string) =>
      filterVehicles(FLEET, chip, needle).map((v) => v.plateNumber);
    expect(plates('DISABLED', 'ab')).toEqual(['ABD 456']);
    expect(plates('DISABLED', 'xyz')).toEqual([]);
    expect(plates('ALL', '6 wheeler')).toEqual(['ABC 123']);
    // Under maintenance has no chip but shows under All
    expect(plates('ALL', '')).toHaveLength(4);
  });

  it('counts each chip under the current search', () => {
    expect(chipCounts(FLEET, '')).toEqual({ ALL: 4, AVAILABLE: 1, UNDER_REPAIR: 1, DISABLED: 1 });
    expect(chipCounts(FLEET, 'ab')).toEqual({ ALL: 3, AVAILABLE: 1, UNDER_REPAIR: 0, DISABLED: 1 });
  });
});

// Spec 0020, AC-10: which status actions a row offers.
const targets = (status: string) => statusActions({ status }).map((a) => a.target);

describe('statusActions', () => {
  it('offers Disable on an Available truck and Make available on a Disabled one', () => {
    expect(targets('AVAILABLE')).toEqual(['DISABLED']);
    expect(targets('DISABLED')).toEqual(['AVAILABLE']);
  });

  it('offers both on an Under repair truck, and none on Under maintenance', () => {
    expect(targets('UNDER_REPAIR')).toEqual(['AVAILABLE', 'DISABLED']);
    expect(targets('UNDER_MAINTENANCE')).toEqual([]);
  });

  it('names the plate in the dialog title', () => {
    const [disable] = statusActions({ status: 'AVAILABLE' });
    expect(disable.title('ABC 123')).toBe('Disable ABC 123?');
    expect(disable.label).toBe('Disable truck');
  });
});
