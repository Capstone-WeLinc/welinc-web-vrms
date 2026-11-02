import type { RepairIssue, RepairTicket, TicketRejection } from '../../../types';
import type { DataMode } from './dataMode';

// Development only (break-ui): the ticket detail page's datasets (spec 0014 UI: the Return to mechanic
// banner, the saved "What fixed it" blocks, the people card). Each takes the real ticket and
// changes only what a real ticket could carry. Limits: remarks and resolution notes 500
// (NOTE_MAX), hours 200 (IssueResolutionDto), issues 10 (the form), actor name 100 and email 255
// (audit_logs). Fixtures are built on call, never at module level, so production drops this file.

const TICKET_URL = /^\/vrms\/repairs\/[0-9a-f-]{36}$/i;

const EMAIL_ONLY = 'bartholomew.fitzgerald@northwind-industries-holdings.example.com';
const LONG_NAME = 'Aleksandra Wiśniewska-Kowalczyk';
const DIACRITICS = 'Đặng Thị Ngọc Hân';

// 500 characters, the most a Return to mechanic comment or a resolution note can hold
const LONG_REMARKS =
  'Rear pads are still squealing after the road test, and the rotor on the left side has a visible groove, so please skim or ' +
  'replace it. The brake fluid reservoir was also topped up past the MAX line. See the photos in the shared folder at ' +
  'https://example.com/welinc/garages/marikina/tickets/2026-10/rear-brakes?tab=photos&filter=unresolved&sort=newest and call ' +
  'Chief Mechanic Đặng Thị Ngọc Hân on the shop floor before you resend, because the driver is waiting at the gate with the ' +
  'next trip booked for 6 AM and cannot take the unit as is.';

const LONG_FIX =
  'Replaced rear pads and skimmed both rotors, bled the lines. Torque sheet: https://example.com/welinc/torque/hino-300-dutro/' +
  'rear-caliper-bracket-bolts-m12x1.25-class-10.9-to-110-nm-then-recheck-after-50-km. Road tested 12 km, no noise. Driver signed off.';

function ago(ms: number) {
  return new Date(Date.now() - ms).toISOString();
}

function issue(base: RepairIssue | undefined, i: number, over: Partial<RepairIssue>): RepairIssue {
  return {
    id: `fixture-issue-${i}`,
    description: '[Brakes] Pads: squealing',
    categoryId: base?.categoryId ?? null,
    categoryName: 'Brakes',
    knowledgeEntry: null,
    steps: [],
    resolutionNote: null,
    hoursSpent: null,
    followedKnownFix: null,
    resolvedAt: null,
    ...over,
  };
}

function worst(t: RepairTicket): RepairTicket {
  const first = t.issues?.[0];
  const rejection: TicketRejection = { remarks: LONG_REMARKS, byName: EMAIL_ONLY, at: ago(3 * 86_400_000) };
  return {
    ...t,
    driverName: 'Jean-Baptiste Emmanuel Zorg Wiśniewska-Kowalczyk',
    garageLocation: 'Sta. Rosa Industrial Estate Service Annex',
    reportedByName: EMAIL_ONLY,
    verifiedByName: 'Aleksandra Wiśniewska-Kowalczyk de la Cruz-Montgomery',
    mechanics: [
      { id: 'fixture-m1', name: LONG_NAME },
      { id: 'fixture-m2', name: 'Jo' },
      { id: 'fixture-m3', name: DIACRITICS },
    ],
    lastRejection: rejection,
    issues: [
      // Returned: note kept, resolvedAt cleared, the longest hours
      issue(first, 1, {
        description: '[Brakes] Rear pads and rotor: squealing when braking at low speed, worse when cold and after rain, on every stop',
        resolutionNote: LONG_FIX,
        hoursSpent: 200,
        followedKnownFix: false,
      }),
      // Followed the known fix, no note, resolved
      issue(first, 2, { description: '[Engine] Fault: oil leak', followedKnownFix: true, resolvedAt: ago(86_400_000) }),
      // Nothing saved yet
      issue(first, 3, { description: '[Transmission] X' }),
    ],
  };
}

function empty(t: RepairTicket): RepairTicket {
  return {
    ...t,
    driverName: 'Jo',
    reportedByName: null,
    verifiedByName: null,
    mechanics: [],
    lastRejection: null,
    issues: [issue(t.issues?.[0], 1, {})],
  };
}

function one(t: RepairTicket): RepairTicket {
  return {
    ...t,
    mechanics: [{ id: 'fixture-m1', name: 'Jo' }],
    lastRejection: { remarks: 'Re-do', byName: 'Jo', at: ago(30_000) },
    issues: [issue(t.issues?.[0], 1, { resolutionNote: 'Fixed', hoursSpent: 0.25 })],
  };
}

function huge(t: RepairTicket): RepairTicket {
  return {
    ...worst(t),
    // The form allows 10 issues on one ticket
    issues: Array.from({ length: 10 }, (_, i) =>
      issue(t.issues?.[0], i + 1, {
        description: `[Brakes] Issue ${i + 1}: ${'worn pads and noisy rotor '.repeat(2).trim()}`,
        resolutionNote: i % 2 === 0 ? LONG_FIX : 'Replaced pads',
        hoursSpent: i % 3 === 0 ? 200 : 1.5,
        resolvedAt: i % 2 === 0 ? null : ago(3_600_000),
      }),
    ),
  };
}

/** The ticket detail response in the chosen dataset, or undefined for any other URL. */
export function decoratedTicket(mode: DataMode, url: string, real: unknown): RepairTicket | undefined {
  if (mode === 'demo' || !TICKET_URL.test(url.split('?')[0])) return undefined;
  const t = real as RepairTicket;
  switch (mode) {
    case 'worst':
      return worst(t);
    case 'empty':
      return empty(t);
    case 'one':
      return one(t);
    case 'huge':
      return huge(t);
  }
}
