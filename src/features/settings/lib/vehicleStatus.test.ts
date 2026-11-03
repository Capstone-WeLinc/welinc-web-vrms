import { describe, expect, it } from 'vitest';
import { statusActions } from './vehicleStatus';

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
