import { describe, expect, it } from 'vitest';
import { openWorkSummary, sharedBlockNote, systemsText, ticketCount } from './openWorkCopy';

describe('openWorkCopy', () => {
  it('lists only the statuses that have tickets', () => {
    expect(openWorkSummary({ OPEN: 0, ASSIGNED: 2, IN_PROGRESS: 1, ON_HOLD: 0 })).toBe('2 assigned, 1 in progress');
    expect(openWorkSummary({ OPEN: 0 })).toBe('');
  });

  it('joins system names', () => {
    expect(systemsText(['VMMS'])).toBe('VMMS');
    expect(systemsText(['VMMS', 'BMS'])).toBe('VMMS and BMS');
    expect(systemsText(['VMMS', 'BMS', 'SHARED'])).toBe('VMMS, BMS and SHARED');
  });

  it('notes the other systems a deactivate also blocks, only for a shared account', () => {
    expect(sharedBlockNote(['VMMS'])).toBe(' This also blocks their VMMS sign in.');
    expect(sharedBlockNote([])).toBe('');
    expect(sharedBlockNote(undefined)).toBe('');
  });

  it('counts tickets in the singular and plural', () => {
    expect(ticketCount(1)).toBe('1 open ticket');
    expect(ticketCount(3)).toBe('3 open tickets');
  });
});
