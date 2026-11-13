import type { MechanicOpenTicket, MechanicOpenTickets, MechanicOption, MechanicWorkload } from '../../../lib/api/vrmsConfigApi';
import type { ManagedUser, RepairStatus, UserRole } from '../../../types';
import type { DataMode } from './dataMode';

// Development only (break-ui): the Users page with the mechanic workload (feature 57): the user
// list, each mechanic's workload, their open tickets and the Reassign dialog's mechanic list.
// Limits that bound the values: a user's name 100 and email 255 (userFormSchema, the columns), a
// plate 20, a mechanic name 100. The mechanics on one ticket have no cap (spec 0019, AC-9), and
// neither does a person's open ticket count, so 40 stands for a very busy mechanic. One source of
// tickets feeds the workload, the dialog and the picker, so the three always agree. Fixtures are
// built on call, so production drops this file.

const NAME_100 = 'Maria Cristina Esperanza de la Cruz-Villanueva y Fernandez-Montgomery de los Santos, Jr.'.padEnd(100, '.').slice(0, 100);
const NO_SPACES = 'Konstantin-Oberhauser-Wettstein-Hohenzollern-Sigmaringen-Wolfeschlegelsteinhausenbergerdorff';
const EMAIL_AS_NAME = 'bartholomew.fitzgerald@northwind-industries-holdings.example.com';
const LONG_EMAIL = 'first.last+billing-notifications.and.dispatch@sub.department.region.northwind-industries-holdings.example.co.uk';
const PLATE_20 = 'NCR-2026-0001 / T-77';

const OPEN: RepairStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'FOR_VERIFICATION', 'OUTSOURCED', 'PENDING_APPROVAL'];

const COWORKERS = [
  'Aleksandra Wiśniewska-Kowalczyk',
  'Christopher Alexander Montgomery III',
  'Ólafur Darri Ólafsson',
  'Seán O’Brien-Ó Súilleabháin',
  'María José de la Cruz y Fernández',
  'Juan dela Cruz',
  'Juan dela Cruz',
  'Jo',
  'Ramon Bulaon',
  'Reynaldo Pascual',
  'Isabel Reyes',
  'Pedro Santos',
];

type Profile = {
  name: string;
  email: string;
  roles?: UserRole[];
  /** Tickets by status, in the order given. */
  tickets?: Partial<Record<RepairStatus, number>>;
  isActive?: boolean;
  isLocked?: boolean;
  emailVerified?: boolean;
  /** How many other mechanics share each ticket: 0 is alone, 11 is the whole crowd. */
  sharedWith?: number;
  plate?: string;
};

const WORST: Profile[] = [
  // A very busy mechanic: every open status, a ticket with eleven others on it, a 20 character plate
  { name: NAME_100, email: LONG_EMAIL, tickets: { OPEN: 2, ASSIGNED: 12, IN_PROGRESS: 8, ON_HOLD: 5, FOR_VERIFICATION: 6, OUTSOURCED: 3, PENDING_APPROVAL: 4 }, sharedWith: 11, plate: PLATE_20 },
  // Exactly one open ticket, and alone on it
  { name: NO_SPACES, email: 'a@b.co', roles: ['CHIEF_MECHANIC'], tickets: { IN_PROGRESS: 1 } },
  { name: 'Aleksandra Wiśniewska-Kowalczyk', email: 'aleksandra.wisniewska-kowalczyk@example.org' },
  { name: 'Jo', email: 'jo@example.com', tickets: { ASSIGNED: 2 }, sharedWith: 1 },
  { name: 'Đặng Thị Ngọc Hân', email: 'han.dang@example.com', tickets: { IN_PROGRESS: 1, ASSIGNED: 2 }, sharedWith: 2 },
  { name: '王秀英', email: 'wang.xiuying@example.com', tickets: { IN_PROGRESS: 5 } },
  { name: 'نور الهدى عبد الرحمن', email: 'nour.alhuda@example.com', tickets: { FOR_VERIFICATION: 1, ON_HOLD: 1 }, sharedWith: 1 },
  { name: '🦊 Fox', email: 'fox@example.com', tickets: { ASSIGNED: 40 }, sharedWith: 3 },
  // Spaces around and inside the name, as typed
  { name: '  Sam   Lee ', email: 'sam.lee@example.com', tickets: { ON_HOLD: 1 } },
  // The email used as the name; a deactivated account that still holds tickets
  { name: EMAIL_AS_NAME, email: EMAIL_AS_NAME, isActive: false, tickets: { ASSIGNED: 3 }, sharedWith: 1 },
  { name: 'Christopher Alexander Montgomery III', email: 'chris.montgomery@example.com', isLocked: true, tickets: { OUTSOURCED: 1, PENDING_APPROVAL: 1 } },
  { name: 'Ólafur Darri Ólafsson', email: 'olafur@example.com', emailVerified: false },
  // Not a mechanic, and one person who is both
  { name: 'Seán O’Brien-Ó Súilleabháin', email: 'sean@example.com', roles: ['ADMIN'] },
  { name: 'María José de la Cruz y Fernández', email: 'maria.jose@example.com', roles: ['ADMIN', 'MECHANIC'], tickets: { IN_PROGRESS: 1, ASSIGNED: 1 } },
  { name: 'dana', email: 'dana@example.com', tickets: { ASSIGNED: 1 } },
];

const FIRST = ['Antonio', 'Armando', 'Benjamin', 'Carlos', 'Dionisio', 'Eduardo', 'Fernando', 'Gregorio', 'Isabel', 'Jaime', 'Leopoldo', 'Manuel', 'Pedro', 'Ramon', 'Renato', 'Wilfredo'];
const LAST = ['Aquino', 'Bautista', 'Castillo', 'dela Cruz', 'Espiritu', 'Garcia', 'Guzman', 'Lopez', 'Mendoza', 'Ocampo', 'Perez', 'Reyes', 'Santos', 'Torres', 'Villanueva'];

function profilesFor(mode: DataMode): Profile[] {
  if (mode === 'empty') return [];
  if (mode === 'one') return [{ name: 'Juan dela Cruz', email: 'juan@example.com', tickets: { IN_PROGRESS: 1 } }];
  if (mode === 'worst') return WORST;
  // huge: 1,284 people; the ticket load cycles from none to a handful
  return Array.from({ length: 1284 }, (_, i) => ({
    name: `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`,
    email: `${FIRST[i % FIRST.length].toLowerCase()}.${LAST[Math.floor(i / FIRST.length) % LAST.length].replace(/\s+/g, '').toLowerCase()}${i}@example.com`,
    tickets: i % 5 === 0 ? {} : { [OPEN[i % OPEN.length]]: (i % 4) + 1 },
  }));
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');
const userId = (i: number) => `fixture-u-${pad(i, 4)}`;
const mechanicId = (i: number) => `fixture-m-${pad(i, 4)}`;

function user(profile: Profile, i: number): ManagedUser {
  const mechanic = profile.roles ?? ['MECHANIC'];
  return {
    id: userId(i),
    name: profile.name,
    email: profile.email,
    emailVerified: profile.emailVerified ?? true,
    passwordSet: true,
    isActive: profile.isActive ?? true,
    isLocked: profile.isLocked ?? false,
    lockedAt: profile.isLocked ? new Date(Date.now() - 3 * 86_400_000).toISOString() : null,
    createdAt: new Date(Date.now() - (40 + (i % 30)) * 86_400_000).toISOString(),
    updatedAt: new Date().toISOString(),
    roles: mechanic.map((role) => ({ role, system: 'VRMS' as const })),
  };
}

function ticketsOf(profile: Profile, i: number): MechanicOpenTicket[] {
  const self = { id: mechanicId(i), name: profile.name };
  const out: MechanicOpenTicket[] = [];
  let n = 0;
  for (const status of OPEN) {
    for (let k = 0; k < (profile.tickets?.[status] ?? 0); k++) {
      n++;
      const others = Array.from({ length: profile.sharedWith ?? 0 }, (_, j) => ({
        id: `fixture-m-co-${j}`,
        name: COWORKERS[(j + n) % COWORKERS.length],
      }));
      out.push({
        id: `fixture-t-${pad(i, 4)}-${pad(n, 3)}`,
        repairNumber: `REP-20261103-${pad(i * 7 + n, 4)}`,
        repairStatus: status,
        updatedAt: new Date(Date.now() - n * 3_600_000).toISOString(),
        // Every third ticket carries the longest plate the column holds
        plateNumber: profile.plate && n % 3 === 1 ? profile.plate : `NBC ${pad(1000 + n * 13, 4)}`,
        mechanics: [self, ...others],
      });
    }
  }
  return out;
}

function workloadOf(profile: Profile, i: number): MechanicWorkload {
  const byStatus = Object.fromEntries(OPEN.map((s) => [s, profile.tickets?.[s] ?? 0])) as Record<string, number>;
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  return { authUserId: userId(i), total, byStatus, occupied: byStatus.IN_PROGRESS > 0 };
}

function pickerOf(profiles: Profile[], mode: DataMode): MechanicOption[] {
  const rows: MechanicOption[] = profiles
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => (p.roles ?? ['MECHANIC']).some((r) => r === 'MECHANIC' || r === 'CHIEF_MECHANIC') && (p.isActive ?? true))
    .map(({ p, i }) => {
      const w = workloadOf(p, i);
      return { id: mechanicId(i), name: p.name, isAvailable: w.total === 0, openCount: w.total, busy: w.occupied, email: p.email, authUserId: userId(i) };
    });
  // One mode is a team of one: nobody else to reassign to
  if (mode === 'one') return rows;
  // Co-workers can be reassigned to as well, two of them with exactly the same name
  const co = COWORKERS.map<MechanicOption>((name, j) => ({
    id: `fixture-m-co-${j}`,
    name,
    isAvailable: true,
    openCount: j % 4,
    busy: j % 5 === 0,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}${j}@example.com`,
  }));
  return [...rows, ...co];
}

/** The Users page, its workload and the Reassign dialog's list; undefined for any other request. */
export function madeUpUsers(mode: DataMode, url: string, params: Record<string, unknown>): unknown {
  if (mode === 'demo') return undefined;
  const profiles = profilesFor(mode);

  if (url === '/auth/users' && params.system === 'VRMS') return profiles.map(user); // check-system: allow AC-33 pending
  if (url === '/vrms/mechanics/workload') return profiles.map(workloadOf);
  if (url === '/vrms/mechanics/available') return pickerOf(profiles, mode);

  const open = /^\/vrms\/mechanics\/(fixture-u-(\d+))\/open-tickets$/.exec(url);
  if (open) {
    const i = Number(open[2]);
    const profile = profiles[i];
    if (!profile) return { mechanicId: null, tickets: [] } satisfies MechanicOpenTickets;
    return { mechanicId: mechanicId(i), tickets: ticketsOf(profile, i) } satisfies MechanicOpenTickets;
  }
  return undefined;
}

/** Saves would send fixture ids to the live auth service, so the Users page stays read only. */
export function isUsersWrite(method: string | undefined, url: string | undefined) {
  if (!method || method.toLowerCase() === 'get' || !url) return false;
  return /^\/auth\/users|^\/vrms\/mechanics\/[^/]+\/release-tickets/.test(url);
}
