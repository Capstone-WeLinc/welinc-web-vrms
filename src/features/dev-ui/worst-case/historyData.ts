import type { RepairHistoryResponse, VerifierOption } from '../../../lib/api/repairApi';
import type { RepairHistoryRow } from '../../../types';
import type { DataMode } from './dataMode';

// Development only (break-ui): the Repair history page (feature 23, the verifier). Made up whole,
// because the dev database has one or two verifiers. Limits: verified_by_name 100 (the column), and
// whoName() falls back to the account's email (255) when a user has no name. The verifier list has
// no cap, but only people with the verify right appear, so 60 is a large office. Fixtures are built
// on call, so production drops this file.

const HISTORY_URL = '/vrms/repairs/history';

const NAME_100 = 'Maria Cristina Esperanza de la Cruz-Villanueva y Fernandez-Montgomery de los Santos, Jr.'.padEnd(100, '.').slice(0, 100);
const NO_SPACES = 'Konstantin-Oberhauser-Wettstein-Hohenzollern-Sigmaringen-Wolfeschlegelsteinhausenbergerdorff';
const EMAIL_ONLY = 'bartholomew.fitzgerald@northwind-industries-holdings.example.com';
const CANCEL_REASON =
  'Customer withdrew the unit after the shop quoted a rear axle replacement; the driver will take it to the dealer under warranty instead.';

type Verifier = VerifierOption;

const WORST_VERIFIERS: Verifier[] = [
  { id: 'fixture-v-1', name: NAME_100 },
  { id: 'fixture-v-2', name: NO_SPACES },
  { id: 'fixture-v-3', name: 'Aleksandra Wiśniewska-Kowalczyk' },
  { id: 'fixture-v-4', name: 'Jo' },
  { id: 'fixture-v-5', name: 'Đặng Thị Ngọc Hân' },
  { id: 'fixture-v-6', name: EMAIL_ONLY },
];

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function row(i: number, over: Partial<RepairHistoryRow>): RepairHistoryRow {
  return {
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    repairNumber: `REP-20261029-${String(i).padStart(4, '0')}`,
    status: 'CLOSED',
    vehiclePlate: 'NBC 1234',
    vehicleModel: 'Hino 300',
    driverName: 'Driver',
    garageLocation: 'Marikina',
    createdAt: daysAgo(6),
    updatedAt: daysAgo(1),
    closedAt: daysAgo(1),
    cancellationReason: undefined,
    isUnlocked: false,
    totalCost: 4000,
    verifiedByName: 'Victor Ramos',
    verifiedAt: daysAgo(1),
    ...over,
  };
}

function verifiedBy(v: Verifier, i: number, over: Partial<RepairHistoryRow> = {}) {
  return row(i, { verifiedByName: v.name, verifiedAt: daysAgo(i % 28), closedAt: daysAgo(i % 28), ...over });
}

function worstRows(): { rows: RepairHistoryRow[]; owners: Map<string, string | null> } {
  const rows = [
    // The longest name the column holds, then one with no break opportunity
    verifiedBy(WORST_VERIFIERS[0], 1, { vehiclePlate: 'NCR-2026-0001 / TRK-77' }),
    verifiedBy(WORST_VERIFIERS[1], 2),
    verifiedBy(WORST_VERIFIERS[2], 3),
    verifiedBy(WORST_VERIFIERS[3], 4),
    verifiedBy(WORST_VERIFIERS[4], 5),
    // An account with no name: the server falls back to the email
    verifiedBy(WORST_VERIFIERS[5], 6),
    // Cancelled: no verifier, a long reason beside it
    row(7, { status: 'CANCELLED', verifiedByName: null, verifiedAt: null, cancellationReason: CANCEL_REASON, totalCost: null }),
    // Closed, but verified before the field existed (or cleared by an Admin override)
    row(8, { verifiedByName: null, verifiedAt: null, isUnlocked: true }),
    // The shortest real name
    row(9, { verifiedByName: 'J', verifiedAt: daysAgo(3) }),
  ];
  const owners = new Map<string, string | null>();
  for (const [i, v] of WORST_VERIFIERS.entries()) owners.set(rows[i].id, v.id);
  owners.set(rows[8].id, null);
  return { rows, owners };
}

function hugeVerifiers(): Verifier[] {
  return [
    ...WORST_VERIFIERS,
    ...Array.from({ length: 54 }, (_, k) => ({ id: `fixture-v-${k + 7}`, name: `Verifier ${String(k + 7).padStart(2, '0')} ${k % 4 === 0 ? 'de la Cruz' : 'Santos'}` })),
  ];
}

function hugeRows(): { rows: RepairHistoryRow[]; owners: Map<string, string | null> } {
  const { rows: long, owners } = worstRows();
  const people = hugeVerifiers();
  const rest = Array.from({ length: 1284 - long.length }, (_, k) => {
    const i = 100 + k;
    if (k % 12 === 11) return row(i, { status: 'CANCELLED', verifiedByName: null, verifiedAt: null, totalCost: null, cancellationReason: 'Not needed' });
    const v = people[k % people.length];
    owners.set(`00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, v.id);
    return verifiedBy(v, i, { totalCost: 1000 + (k % 90) * 137 });
  });
  return { rows: [...long, ...rest], owners };
}

function oneRow(): { rows: RepairHistoryRow[]; owners: Map<string, string | null> } {
  const only = row(1, { verifiedByName: 'Jo', totalCost: 1 });
  return { rows: [only], owners: new Map([[only.id, 'fixture-v-4']]) };
}

function numberParam(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** The History page's `/vrms/repairs/history` response in the chosen dataset, or undefined to ask the server. */
export function madeUpHistory(mode: DataMode, url: string, params: Record<string, unknown>): RepairHistoryResponse | undefined {
  if (mode === 'demo' || url.split('?')[0] !== HISTORY_URL) return undefined;

  const empty = mode === 'empty';
  const built = empty ? { rows: [] as RepairHistoryRow[], owners: new Map<string, string | null>() } : mode === 'one' ? oneRow() : mode === 'huge' ? hugeRows() : worstRows();
  const verifiers: Verifier[] = empty ? [] : mode === 'one' ? [{ id: 'fixture-v-4', name: 'Jo' }] : mode === 'huge' ? hugeVerifiers() : WORST_VERIFIERS;

  // The same narrowing the server does, so the tiles and the list agree
  const status = params.status === 'CLOSED' || params.status === 'CANCELLED' ? params.status : undefined;
  const who = typeof params.verifiedBy === 'string' ? params.verifiedBy : undefined;
  // Newest close first, like the server: the table groups by month and expects each month in one run
  const matching = built.rows
    .filter((r) => (!status || r.status === status) && (!who || built.owners.get(r.id) === who))
    .sort((x, y) => (y.closedAt ?? '').localeCompare(x.closedAt ?? ''));

  const page = numberParam(params.page, 1);
  const limit = numberParam(params.limit, matching.length || 1);
  const closed = matching.filter((r) => r.status === 'CLOSED');

  return {
    data: matching.slice((page - 1) * limit, page * limit),
    total: matching.length,
    summary: {
      finished: matching.length,
      closed: closed.length,
      cancelled: matching.length - closed.length,
      spend: closed.reduce((sum, r) => sum + (r.totalCost ?? 0), 0),
    },
    verifiers,
  };
}
