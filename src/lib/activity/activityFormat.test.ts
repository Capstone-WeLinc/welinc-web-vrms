import { describe, expect, it } from 'vitest';
import type { ActivityCatalog, ActivityEvent } from '../api/activityApi';
import type { SystemView } from '../../types';
import { eventTitle, groupByDay, manilaDayHeading, manilaDayKey, placeText, rolesText, whereText } from './activityFormat';

const catalog: ActivityCatalog = {
  categories: [],
  types: [
    { code: 'SIGNED_IN', category: 'SIGN_IN', label: 'Signed in', labelAdmin: 'Signed in' },
    { code: 'SIGN_IN_FAILED', category: 'SIGN_IN', label: 'Sign in failed', labelAdmin: 'Sign in failed' },
    { code: 'SYSTEM_OPENED', category: 'SESSION', label: 'Opened a system', labelAdmin: 'Opened a system' },
    { code: 'ROLE_CHANGED', category: 'ACCOUNT', label: 'Role changed', labelAdmin: 'An admin changed your role' },
  ],
  reasons: [{ code: 'WRONG_PASSWORD', label: 'Wrong password' }],
};
const systems = [
  {
    code: 'VRMS',
    name: 'VRMS',
    webAddress: null,
    maxRolesPerUser: null,
    roles: [
      { code: 'MECHANIC', name: 'Mechanic', description: '', isSystemAdmin: false },
      { code: 'CHIEF_MECHANIC', name: 'Chief mechanic', description: '', isSystemAdmin: false },
    ],
  },
] as SystemView[];
const labels = { catalog, systems };

function event(over: Partial<ActivityEvent>): ActivityEvent {
  return {
    id: 'e1',
    category: 'SIGN_IN',
    type: 'SIGNED_IN',
    reason: null,
    system: null,
    sessionId: null,
    field: null,
    oldValue: null,
    newValue: null,
    attemptsLeft: null,
    address: null,
    localNetwork: false,
    device: null,
    userAgent: null,
    country: null,
    network: null,
    createdAt: '2026-11-12T02:00:00.000Z',
    actor: { kind: 'SELF' },
    ...over,
  };
}

// covers: spec 0011 AC-19 (Manila days, labels, labelAdmin, role names, places)
describe('activity days', () => {
  it('groups by the Manila day, not the device day', () => {
    // 16:30 UTC on the 11th is 00:30 on the 12th in Manila
    expect(manilaDayKey('2026-11-11T16:30:00.000Z')).toBe('2026-11-12');
    const now = new Date('2026-11-12T04:00:00.000Z');
    const days = groupByDay(
      [
        event({ id: 'a', createdAt: '2026-11-12T01:00:00.000Z' }),
        event({ id: 'b', createdAt: '2026-11-11T16:30:00.000Z' }),
        event({ id: 'c', createdAt: '2026-11-11T15:30:00.000Z' }),
      ],
      now,
    );
    expect(days.map((d) => [d.heading, d.events.map((e) => e.id)])).toEqual([
      ['Today', ['a', 'b']],
      ['Yesterday', ['c']],
    ]);
  });

  it('adds the year outside this year', () => {
    expect(manilaDayHeading('2025-03-02T04:00:00.000Z', new Date('2026-11-12T04:00:00.000Z'))).toBe('Sun, Mar 2, 2025');
  });
});

describe('eventTitle', () => {
  it('names the system opened and the fail reason with tries left', () => {
    expect(eventTitle(event({ type: 'SYSTEM_OPENED', system: 'VRMS' }), labels, 'self')).toBe('Opened VRMS');
    expect(eventTitle(event({ type: 'SIGN_IN_FAILED', reason: 'WRONG_PASSWORD', attemptsLeft: 1 }), labels, 'self')).toBe(
      'Sign in failed: Wrong password (1 try left)',
    );
  });

  it('uses labelAdmin only for your own view of an admin action, with role names', () => {
    const roleChange = event({
      type: 'ROLE_CHANGED',
      category: 'ACCOUNT',
      system: 'VRMS',
      oldValue: 'MECHANIC@VRMS',
      newValue: 'CHIEF_MECHANIC@VRMS',
      actor: { kind: 'ADMIN' },
    });
    expect(eventTitle(roleChange, labels, 'self')).toBe('An admin changed your role in VRMS: Mechanic to Chief mechanic');
    expect(eventTitle(roleChange, labels, 'admin')).toBe('Role changed in VRMS: Mechanic to Chief mechanic');
  });

  it('falls back to the code when the catalog is missing', () => {
    expect(eventTitle(event({ type: 'NEW_THING' }), { catalog: null, systems: [] }, 'self')).toBe('NEW_THING');
    expect(rolesText(null, labels)).toBe('no role');
  });
});

describe('places', () => {
  it('reads Local network, a country and provider, or nothing', () => {
    expect(placeText(event({ localNetwork: true }))).toBe('Local network');
    expect(placeText(event({ country: 'PH', network: 'Globe Telecom' }))).toBe('Philippines · Globe Telecom');
    expect(placeText(event({}))).toBeNull();
    expect(whereText(event({ device: 'Chrome on Windows', address: '203.0.113.7', country: 'PH' }))).toBe(
      'Chrome on Windows, 203.0.113.7, Philippines',
    );
  });
});
