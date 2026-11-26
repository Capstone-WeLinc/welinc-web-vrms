import { describe, expect, it } from 'vitest';
import { auditView, deliveryFiltersFrom, deliveryParams, deliverySubject, lastErrorText } from './deliveries';

// Spec 0029, AC-22: the Deliveries tab's URL filters and words.

describe('deliveries (AC-22)', () => {
  it('reads the view and the filters from the URL, leaving out anything unknown', () => {
    expect(auditView('deliveries')).toBe('deliveries');
    expect(auditView('other')).toBe('activity');
    expect(deliveryFiltersFrom(new URLSearchParams('status=FAILED&target=BMS&kind=nope'))).toEqual({
      status: 'FAILED',
      target: 'BMS',
      kind: undefined,
    });
    expect(deliveryParams({ status: 'PENDING' })).toEqual({ view: 'deliveries', status: 'PENDING' });
  });

  it('names the ticket, else the referral, else nothing', () => {
    const ticket = { id: 't1', repairNumber: 'REP-1' };
    const referral = { id: 'r1', workOrderNumber: 'WO-7' };
    expect(deliverySubject({ ticket, referral })).toBe('REP-1');
    expect(deliverySubject({ ticket: null, referral })).toBe('WO-7');
    expect(deliverySubject({ ticket: null, referral: null })).toBeNull();
  });

  it('shows the last error as code and name', () => {
    expect(lastErrorText({ lastStatusCode: 409, lastError: 'INVALID_REPAIR_EVENT' })).toBe('409 INVALID_REPAIR_EVENT');
    expect(lastErrorText({ lastStatusCode: null, lastError: 'TimeoutError' })).toBe('TimeoutError');
    expect(lastErrorText({ lastStatusCode: 503, lastError: null })).toBe('503');
    expect(lastErrorText({ lastStatusCode: null, lastError: null })).toBeNull();
  });
});
