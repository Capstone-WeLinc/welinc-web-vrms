import { describe, expect, it } from 'vitest';
import { driverLabel, NO_DRIVER_LABEL } from './ticketDriver';

// covers: spec 0029 AC-12
describe('driverLabel', () => {
  it('names the driver, or says the ticket came from VMMS with none', () => {
    expect(driverLabel('Ramon Bautista')).toBe('Ramon Bautista');
    expect(driverLabel(null)).toBe(NO_DRIVER_LABEL);
    expect(NO_DRIVER_LABEL).toBe('None (from VMMS)');
  });
});
