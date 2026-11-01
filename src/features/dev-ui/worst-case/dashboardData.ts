import type { RepairTicket, TicketCan } from '../../../types';
import type { DataMode } from './dataMode';

// Development only (break-ui): the Chief Mechanic dashboard's ticket list (spec 0015). Made up
// whole, because a dev database may hold nothing in For verification. Limits: plate 20, garage 50,
// driver 100 (CreateRepairDto), mechanic name 100 (Mechanic.name). A ticket takes several
// mechanics, with no cap found. Fixtures are built on call, so production drops this file.

const DASHBOARD_LIMIT = 10000; // useDashboardData's ADMIN_LIMIT; the repair list page never sends it

const CAN: TicketCan = { work: false, administer: false, verify: true, editCosts: false, unlock: false, assign: false };

const MECHANIC_100 = 'Maria Cristina Esperanza de la Cruz-Villanueva y Fernandez-Montgomery de los Santos, Jr.'.padEnd(100, '.').slice(0, 100);

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function base(i: number, over: Partial<RepairTicket>): RepairTicket {
  const stamp = minutesAgo(90);
  return {
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    repairNumber: `REP-20261029-${String(i).padStart(4, '0')}`,
    vehiclePlate: 'NBC 1234',
    driverName: 'Driver',
    issueDescription: 'Brake noise',
    status: 'FOR_VERIFICATION',
    createdAt: stamp,
    updatedAt: stamp,
    statusChangedAt: stamp,
    garageLocation: 'Marikina',
    mechanics: [{ id: `fixture-m-${i}`, name: 'Juan Dela Cruz' }],
    can: CAN,
    moves: [],
    ...over,
  };
}

function worst(): RepairTicket[] {
  return [
    // Oldest wait first: 45 days, the longest plate (20), the longest garage (50), four mechanics
    base(1, {
      statusChangedAt: minutesAgo(45 * 1440),
      vehiclePlate: 'NCR-2026-0001 / TRK-77',
      garageLocation: 'Sta. Rosa Industrial Estate Service Annex Bldg 2',
      mechanics: [
        { id: 'f1', name: 'Aleksandra Wiśniewska-Kowalczyk' },
        { id: 'f2', name: 'Jo' },
        { id: 'f3', name: 'Đặng Thị Ngọc Hân' },
        { id: 'f4', name: MECHANIC_100 },
      ],
    }),
    // A mechanic name with no spaces to wrap at
    base(2, {
      statusChangedAt: minutesAgo(9 * 1440),
      mechanics: [{ id: 'f5', name: 'Konstantin-Oberhauser-Wettstein-Hohenzollern-Sigmaringen-Wolfeschlegelsteinhausenbergerdorff' }],
    }),
    // No mechanic, no garage
    base(3, { statusChangedAt: minutesAgo(30 * 60), mechanics: [], garageLocation: undefined }),
    // Exactly one day, one hour
    base(4, { statusChangedAt: minutesAgo(1440), vehiclePlate: 'A1' }),
    base(5, { statusChangedAt: minutesAgo(60), vehiclePlate: 'ΑΒΕ 1234' }),
    // Under a minute, and a clock ahead of the server
    base(6, { statusChangedAt: minutesAgo(0) }),
    base(7, { statusChangedAt: minutesAgo(-120) }),
    base(8, { statusChangedAt: 'not a date' }),
    // Past the 8 the section shows, so See all matters
    base(9, { statusChangedAt: minutesAgo(10) }),
    base(10, { statusChangedAt: minutesAgo(5) }),
  ];
}

function huge(): RepairTicket[] {
  const long = worst();
  const rest = Array.from({ length: 1284 - long.length }, (_, k) =>
    base(100 + k, { statusChangedAt: minutesAgo(10 + k * 7), status: k % 3 === 0 ? 'FOR_VERIFICATION' : 'IN_PROGRESS', can: k % 3 === 0 ? CAN : { ...CAN, verify: false, work: true } }),
  );
  return [...long, ...rest];
}

/** The dashboard's `/vrms/repairs` response in the chosen dataset, or undefined to ask the server. */
export function dashboardTickets(mode: DataMode, url: string, params: Record<string, unknown>) {
  if (mode === 'demo' || url.split('?')[0] !== '/vrms/repairs' || params.limit !== DASHBOARD_LIMIT) return undefined;
  const data = mode === 'worst' ? worst() : mode === 'huge' ? huge() : mode === 'one' ? [base(1, {})] : [];
  return { data, total: data.length };
}
