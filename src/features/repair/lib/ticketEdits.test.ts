import { describe, expect, it } from 'vitest';
import { ticket } from '../../../test/ticketFixture';
import {
  detailsDefaults,
  detailsPayload,
  detailsSchema,
  editNeedsReason,
  mechanicsEffect,
  openedCorporationId,
  ticketEditable,
  type DetailsFormValues,
} from './ticketEdits';

// Spec 0019: what the detail page offers and what the details dialog sends.

const AT = '2026-11-03T01:00:00.000Z';
const base = ticket({
  driverId: 'd1',
  driverName: 'Juan Cruz',
  odometerReading: 120400,
  priority: 'MEDIUM',
  accountType: 'ONLINE',
  corporation: null,
});
const opened = detailsDefaults(base);
const edit = (over: Partial<DetailsFormValues>): DetailsFormValues => ({ ...opened, ...over });

describe('ticketEditable (AC-2)', () => {
  it.each(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'FOR_VERIFICATION', 'OUTSOURCED', 'PENDING_APPROVAL'] as const)(
    'is editable while %s',
    (status) => {
      expect(ticketEditable(ticket({ status }))).toBe(true);
      expect(editNeedsReason(ticket({ status }))).toBe(false);
    },
  );

  it.each(['CLOSED', 'CANCELLED'] as const)('is locked while %s, and editable with a reason once unlocked', (status) => {
    expect(ticketEditable(ticket({ status }))).toBe(false);
    expect(ticketEditable(ticket({ status, isUnlocked: false }))).toBe(false);
    expect(ticketEditable(ticket({ status, isUnlocked: true }))).toBe(true);
    expect(editNeedsReason(ticket({ status }))).toBe(true);
  });
});

describe('detailsPayload (AC-4 to AC-8b)', () => {
  it('is null when nothing changed, so no request is made', () => {
    expect(detailsPayload(edit({ reason: 'ignored' }), opened, base, AT)).toBeNull();
  });

  it('sends only what changed, with the opened lastUpdatedAt', () => {
    expect(detailsPayload(edit({ priority: 'HIGH', odometer: '120040' }), opened, base, AT)).toEqual({
      lastUpdatedAt: AT,
      odometerReading: 120040,
      priority: 'HIGH',
    });
  });

  it('sends a swapped driver by id, and a new one by name and upper case license', () => {
    expect(detailsPayload(edit({ driverId: 'd2' }), opened, base, AT)).toEqual({ lastUpdatedAt: AT, driverId: 'd2' });
    expect(
      detailsPayload(edit({ addingDriver: true, newDriverName: ' Pedro ', newDriverLicense: 'b02-34-567890' }), opened, base, AT),
    ).toEqual({ lastUpdatedAt: AT, newDriver: { name: 'Pedro', licenseNumber: 'B02-34-567890' } });
  });

  it('confirms the jump only for the reading the server warned about', () => {
    expect(detailsPayload(edit({ odometer: '160000' }), opened, base, AT, true)).toEqual({
      lastUpdatedAt: AT,
      odometerReading: 160000,
      confirmOdometerJump: true,
    });
  });

  it('sends Corporate with its corporation, and Online alone', () => {
    expect(detailsPayload(edit({ accountType: 'CORPORATE', corporationId: 'c1' }), opened, base, AT)).toEqual({
      lastUpdatedAt: AT,
      accountType: 'CORPORATE',
      corporationId: 'c1',
    });
    const corporate = ticket({ ...base, accountType: 'CORPORATE', corporation: 'Acme' });
    const openedCorporate = { ...detailsDefaults(corporate), corporationId: 'c1' };
    expect(detailsPayload({ ...openedCorporate, accountType: 'ONLINE' }, openedCorporate, corporate, AT)).toEqual({
      lastUpdatedAt: AT,
      accountType: 'ONLINE',
    });
  });

  it('leaves a Corporate ticket alone when its stored corporation is no longer listed', () => {
    const corporate = ticket({ ...base, accountType: 'CORPORATE', corporation: 'Gone Inc' });
    const openedCorporate = detailsDefaults(corporate);
    expect(detailsPayload({ ...openedCorporate, priority: 'LOW' }, openedCorporate, corporate, AT)).toEqual({
      lastUpdatedAt: AT,
      priority: 'LOW',
    });
  });

  it('adds the trimmed reason on a closed ticket (AC-3)', () => {
    const closed = ticket({ ...base, status: 'CLOSED', isUnlocked: true });
    expect(detailsPayload(edit({ priority: 'HIGH', reason: '  Entered wrong  ' }), opened, closed, AT)).toEqual({
      lastUpdatedAt: AT,
      priority: 'HIGH',
      reason: 'Entered wrong',
    });
  });
});

describe('detailsSchema', () => {
  const ok = (values: DetailsFormValues, needsReason = false, account: DetailsFormValues['accountType'] = 'ONLINE') =>
    detailsSchema(needsReason, account).safeParse(values).success;

  it('accepts the ticket as it opened', () => {
    expect(ok(opened)).toBe(true);
  });

  it.each(['', 'abc', '12.5', '-3'])('refuses the odometer %p', (odometer) => {
    expect(ok(edit({ odometer }))).toBe(false);
  });

  it('checks a new driver with the create form rules (AC-4)', () => {
    expect(ok(edit({ addingDriver: true, newDriverName: 'Pedro', newDriverLicense: 'B02-34-567890' }))).toBe(true);
    expect(ok(edit({ addingDriver: true, newDriverName: 'Pedro', newDriverLicense: 'B0234567890' }))).toBe(false);
    expect(ok(edit({ addingDriver: true, newDriverName: ' ', newDriverLicense: 'B02-34-567890' }))).toBe(false);
  });

  it('needs a corporation when switching to Corporate, not on a ticket that was already Corporate (AC-7)', () => {
    expect(ok(edit({ accountType: 'CORPORATE', corporationId: '' }))).toBe(false);
    expect(ok(edit({ accountType: 'CORPORATE', corporationId: '' }), false, 'CORPORATE')).toBe(true);
  });

  it.each(['', '    ', 'abcd', 'x'.repeat(501)])('refuses the reason %p on a closed ticket (AC-3)', (reason) => {
    expect(ok(edit({ reason }), true)).toBe(false);
  });

  it('takes 5 to 500 trimmed characters as the reason on a closed ticket', () => {
    expect(ok(edit({ reason: '  abcde  ' }), true)).toBe(true);
  });
});

describe('openedCorporationId', () => {
  it('finds the stored name among the active corporations, else none', () => {
    const list = [
      { id: 'c1', name: 'Acme' },
      { id: 'c2', name: 'Beta' },
    ];
    expect(openedCorporationId({ corporation: 'Beta' }, list)).toBe('c2');
    expect(openedCorporationId({ corporation: 'Gone Inc' }, list)).toBe('');
    expect(openedCorporationId({ corporation: null }, list)).toBe('');
  });
});

describe('mechanicsEffect (AC-10)', () => {
  it('says an Open ticket becomes Assigned on its first mechanic', () => {
    expect(mechanicsEffect('OPEN', 0, 1)).toBe('The ticket becomes Assigned.');
  });

  it('says an Assigned ticket goes back to Open with nobody left', () => {
    expect(mechanicsEffect('ASSIGNED', 2, 0)).toBe('With no mechanic, the ticket goes back to Open.');
  });

  it('says a later status stays and shows No mechanic', () => {
    expect(mechanicsEffect('IN_PROGRESS', 1, 0)).toContain('stays In progress');
  });

  it('says nothing for a swap', () => {
    expect(mechanicsEffect('ASSIGNED', 1, 1)).toBeNull();
    expect(mechanicsEffect('IN_PROGRESS', 1, 2)).toBeNull();
  });
});
