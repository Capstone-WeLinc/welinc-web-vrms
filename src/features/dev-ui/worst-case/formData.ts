import type { DriverOption, GarageOption, LookupOption, MechanicOption, VehicleOption, VehicleSummary } from '../../../lib/api/vrmsConfigApi';
import type { ManagedVehicle } from '../../../lib/api/vehiclesApi';
import type { DataMode } from './dataMode';

// Development only (break-ui, spec 0016): the new repair form, its pickers and the two new
// Settings sections. Limits used: plate 20 (vehicles.plate_number), garage 50, driver and lookup
// names 100, 10 issues per ticket. Real naming patterns elsewhere. Fixtures are built on call,
// never at module level, so production drops this file.

const MODEL_LONG = 'Mitsubishi Fuso Canter FE85 Refrigerated Wing Van, Long Wheelbase';
const NAME_LONG = 'Aleksandra Wiśniewska-Kowalczyk de la Cruz-Montgomery';
const NAME_VIET = 'Đặng Thị Ngọc Hân';
const TYPE_LONG = 'Refrigerated wing van, long wheelbase, double axle rear'.padEnd(100, ' x').slice(0, 100).trim();
const CORP_LONG = 'Northwind Industries Holdings and Subsidiaries Philippines Incorporated';
const PLATES = ['NAB 12345-TEMP-2026X', 'AB 1', 'NCX 3359', 'CONDUCTION 0042A', 'TGD 908'];
const STATUSES = ['AVAILABLE', 'UNDER_REPAIR', 'DISABLED', 'AVAILABLE', 'UNDER_REPAIR'];

const plate = (i: number) => (i < PLATES.length ? PLATES[i] : `PLT ${String(1000 + i)}`);

function vehicleCount(mode: DataMode) {
  return mode === 'empty' ? 0 : mode === 'one' ? 1 : mode === 'huge' ? 1284 : 8;
}

function vehicles(mode: DataMode): VehicleOption[] {
  return Array.from({ length: vehicleCount(mode) }, (_, i) => ({
    id: `fixture-v-${i}`,
    plateNumber: plate(i),
    model: i % 2 === 0 ? MODEL_LONG : 'Hino 300',
    status: STATUSES[i % STATUSES.length],
  }));
}

function managed(mode: DataMode): ManagedVehicle[] {
  const types = [{ id: 'fixture-t-0', name: TYPE_LONG }, null, { id: 'fixture-t-1', name: '4 wheeler' }];
  return vehicles(mode).map((v, i) => ({ ...v, type: types[i % types.length], updatedAt: new Date().toISOString() }));
}

function mechanics(mode: DataMode): MechanicOption[] {
  const names = [NAME_LONG, 'Jo', NAME_VIET, 'Pedro Santos', 'José Ángel Núñez Ibáñez', 'Maria Cristina Dela Cruz-Reyes'];
  const count = mode === 'empty' ? 0 : mode === 'one' ? 1 : mode === 'huge' ? 60 : 8;
  return Array.from({ length: count }, (_, i) => ({
    id: `fixture-m-${i}`,
    name: i < names.length ? names[i] : `Mechanic ${i + 1}`,
    // "No free mechanics": every row busy in the worst case
    isAvailable: mode === 'worst' ? false : i % 3 !== 0,
    openCount: [0, 1, 12, 99, 3, 0, 7][i % 7],
    busy: [0, 1, 12, 99, 3, 0, 7][i % 7] > 0 && (mode === 'worst' || i % 2 === 0),
    email: null,
    authUserId: null,
  }));
}

function drivers(mode: DataMode, q: string): DriverOption[] {
  const all: DriverOption[] = [
    { id: 'fixture-d-0', name: NAME_LONG, licenseNumber: 'N10-17-275503' },
    { id: 'fixture-d-1', name: 'Jo', licenseNumber: 'A01-23-456789' },
    { id: 'fixture-d-2', name: NAME_VIET, licenseNumber: 'D13-13-804216' },
    ...Array.from({ length: 30 }, (_, i) => ({ id: `fixture-d-${i + 3}`, name: `Driver ${i + 4}`, licenseNumber: `B02-24-${String(100000 + i)}` })),
  ];
  const limit = mode === 'empty' ? 0 : mode === 'one' ? 1 : 20;
  const needle = q.trim().toLowerCase();
  return all
    .filter((d) => !needle || d.name.toLowerCase().includes(needle) || (d.licenseNumber ?? '').toLowerCase().includes(needle))
    .slice(0, limit);
}

function garages(mode: DataMode): GarageOption[] {
  if (mode === 'empty') return [];
  return [
    { id: 'fixture-g-0', name: 'Sta. Rosa Industrial Estate Service Annex Bay'.slice(0, 50) },
    { id: 'fixture-g-1', name: 'Marikina' },
  ].slice(0, mode === 'one' ? 1 : 2);
}

function lookup(list: string, mode: DataMode, all: boolean): (LookupOption & { isActive: boolean; sortOrder: number })[] {
  const name = (i: number) => (list === 'corporation' ? (i === 0 ? CORP_LONG : i === 1 ? 'Jo' : `Corporation ${i + 1}`) : i === 0 ? TYPE_LONG : i === 1 ? '4 wheeler' : `Vehicle type ${i + 1}`);
  const count = mode === 'empty' ? 0 : mode === 'one' ? 1 : mode === 'huge' ? 200 : 6;
  const rows = Array.from({ length: count }, (_, i) => ({ id: `fixture-l-${list}-${i}`, name: name(i), isActive: i % 4 !== 3, sortOrder: (i + 1) * 10 }));
  return all ? rows : rows.filter((r) => r.isActive);
}

function summary(mode: DataMode, id: string): VehicleSummary {
  const i = Number(id.replace('fixture-v-', '')) || 0;
  const long = mode === 'worst' || mode === 'huge';
  return {
    id,
    plateNumber: plate(i),
    model: long ? MODEL_LONG : 'Hino 300',
    status: STATUSES[i % STATUSES.length],
    type: i % 3 === 1 ? null : { id: 'fixture-t-0', name: long ? TYPE_LONG : '4 wheeler' },
    lastOdometer: i % 2 === 0 ? 1_284_567 : 0,
    lastRepairAt: i % 3 === 2 ? null : new Date(Date.now() - 86_400_000).toISOString(),
    lastDriver: i % 3 === 0 ? { id: 'fixture-d-0', name: NAME_LONG, licenseNumber: 'N10-17-275503' } : null,
    // Every fourth truck already has an open ticket
    openTicket: i % 4 === 3 ? { id: 'fixture-ticket', repairNumber: 'REP-20261101-XXXXXXXX', repairStatus: 'IN_PROGRESS' } : null,
  };
}

/** A list or summary for the repair form and the new Settings sections, or undefined for any other URL. */
export function madeUpFormData(mode: DataMode, url: string, params: Record<string, unknown>): unknown {
  if (mode === 'demo') return undefined;
  const path = url.split('?')[0];
  if (path === '/vrms/config/vehicles') return vehicles(mode);
  if (path === '/vrms/vehicles') return managed(mode);
  if (path === '/vrms/mechanics/available') return mechanics(mode);
  if (path === '/vrms/config/drivers') return drivers(mode, typeof params.q === 'string' ? params.q : '');
  if (path === '/vrms/config/garages') return garages(mode);
  const summaryMatch = /^\/vrms\/vehicles\/([^/]+)\/summary$/.exec(path);
  if (summaryMatch) return summary(mode, summaryMatch[1]);
  const lookupMatch = /^\/vrms\/lookups\/([a-z_]+)(\/all)?$/.exec(path);
  if (lookupMatch) return lookup(lookupMatch[1], mode, lookupMatch[2] === '/all');
  return undefined;
}

/** Saves would send fixture ids to the live database, so the new form and sections stay read only. */
export function isFormWrite(method: string | undefined, url: string | undefined) {
  if (!method || method.toLowerCase() === 'get' || !url) return false;
  return /^\/vrms\/(repairs$|repairs\/[^/]+\/assignments|lookups|vehicles)/.test(url);
}
