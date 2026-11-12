import api from './axios';
import type { RepairStatus } from '../../types';

export interface GarageOption {
  id: string;
  name: string;
}

export interface VehicleOption {
  id: string;
  plateNumber: string;
  model: string;
  status: string;
}

export interface MechanicOption {
  id: string;
  name: string;
  isAvailable: boolean;
  /** Assignments on tickets in an open status (spec 0016, AC-14). */
  openCount: number;
  /** One of those tickets is In Progress. */
  busy: boolean;
  /** The welinc-auth user's email, lowercased; null for a row with no login. */
  email?: string | null;
  /** The welinc-auth user id; the Users page matches people to mechanics on it (spec 0009, AC-9). */
  authUserId?: string | null;
}

export async function getGarages(): Promise<GarageOption[]> {
  const response = await api.get<GarageOption[]>('/vrms/config/garages');
  return response.data;
}

export async function getVehicles(): Promise<VehicleOption[]> {
  const response = await api.get<VehicleOption[]>('/vrms/config/vehicles');
  return response.data;
}

export async function getAvailableMechanics(): Promise<MechanicOption[]> {
  const response = await api.get<MechanicOption[]>('/vrms/mechanics/available');
  return response.data;
}

export interface DriverOption {
  id: string;
  name: string;
  /** Only sent to a caller who can create tickets (spec 0016, AC-13). */
  licenseNumber?: string;
}

/** Active drivers matching `q` on name or license, up to 20 (spec 0016, AC-13). */
export async function getDrivers(q?: string): Promise<DriverOption[]> {
  const response = await api.get<DriverOption[]>('/vrms/config/drivers', { params: q ? { q } : undefined });
  return response.data;
}

export interface LookupOption {
  id: string;
  name: string;
}

/** The active values of a generic lookup list, such as `corporation` (spec 0016, AC-19). */
export async function getLookup(list: 'corporation' | 'vehicle_type'): Promise<LookupOption[]> {
  const response = await api.get<LookupOption[]>(`/vrms/lookups/${list}`);
  return response.data;
}

export interface OpenWork {
  total: number;
  /** Every open status as a key, zeros included. */
  byStatus: Record<string, number>;
}

export interface MechanicWorkload extends OpenWork {
  authUserId: string;
  /** At least one open ticket is In Progress (feature 57, the same rule as the picker's `busy`). */
  occupied: boolean;
}

/** Every mechanic's open work, for the Users page (users.manage, feature 57). */
export async function getMechanicWorkload(): Promise<MechanicWorkload[]> {
  const response = await api.get<MechanicWorkload[]>('/vrms/mechanics/workload', { quiet: true });
  return response.data;
}

/** A roster person's VRMS role; null until their next sign in or Admin sync fills it (spec 0022, AC-4). */
export type RosterRole = 'MECHANIC' | 'CHIEF_MECHANIC';

/** One person on the Chief dashboard's Team section (spec 0022, AC-2). */
export interface MechanicRosterRow extends MechanicWorkload {
  /** The mechanics.id that ticket assignments use: the Team join key, never the name. */
  mechanicId: string;
  name: string;
  email: string | null;
  role: RosterRole | null;
  isActive: boolean;
}

/** Every active roster person, plus inactive ones still holding open tickets (mechanics.view or users.manage). */
export async function getMechanicRoster(options: { quiet?: boolean } = {}): Promise<MechanicRosterRow[]> {
  const response = await api.get<MechanicRosterRow[]>('/vrms/mechanics/roster', { quiet: options.quiet });
  return response.data;
}

/** Why the directory feed released a ticket: the person was deleted, deactivated, or lost their VRMS role. */
export type LeaveReason = 'DELETED' | 'DEACTIVATED' | 'ROLE_REMOVED';

/** One ticket the directory feed released in the last 7 days, newest first (suite spec 0013, AC-32). */
export interface ReleasedTicket {
  /** The audit row id; a ticket released from two people appears twice. */
  id: string;
  ticketId: string;
  repairNumber: string;
  /** The ticket's status now. */
  repairStatus: RepairStatus;
  plateNumber: string;
  /** The name the release recorded; "Deleted user" after an erasure. */
  person: string | null;
  reason: LeaveReason | null;
  releasedAt: string;
}

/** Tickets released because their mechanic left VRMS (mechanics.view or users.manage). */
export async function getReleasedTickets(): Promise<ReleasedTicket[]> {
  const response = await api.get<ReleasedTicket[]>('/vrms/mechanics/released', { quiet: true });
  return response.data;
}

export interface MechanicOpenTicket {
  id: string;
  repairNumber: string;
  repairStatus: RepairStatus;
  /** Sent back as lastUpdatedAt on unassign or reassign. */
  updatedAt: string;
  plateNumber: string;
  mechanics: { id: string; name: string }[];
}

export interface MechanicOpenTickets {
  /** The person's Mechanic row id; null when they have none. */
  mechanicId: string | null;
  tickets: MechanicOpenTicket[];
}

/** The person's open tickets with every mechanic on each (users.manage, feature 57). */
export async function getMechanicOpenTickets(authUserId: string): Promise<MechanicOpenTickets> {
  const response = await api.get<MechanicOpenTickets>(`/vrms/mechanics/${authUserId}/open-tickets`, { quiet: true });
  return response.data;
}

export interface VehicleSummary {
  id: string;
  plateNumber: string;
  model: string;
  status: string;
  type: { id: string; name: string } | null;
  lastOdometer: number;
  lastRepairAt: string | null;
  lastDriver: { id: string; name: string; licenseNumber: string } | null;
  openTicket: { id: string; repairNumber: string; repairStatus: string } | null;
}

/** What the system knows about a truck, for the new ticket form (ticket.create, spec 0016, AC-11). */
export async function getVehicleSummary(id: string): Promise<VehicleSummary> {
  const response = await api.get<VehicleSummary>(`/vrms/vehicles/${id}/summary`, { quiet: true });
  return response.data;
}

export interface LookupValue {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

/** Every value of a list, inactive ones too (lookups.manage, spec 0016, AC-19). */
export async function getLookupAll(list: string): Promise<LookupValue[]> {
  const response = await api.get<LookupValue[]>(`/vrms/lookups/${list}/all`, { quiet: true });
  return response.data;
}

export async function createLookupValue(list: string, name: string): Promise<LookupValue> {
  const response = await api.post<LookupValue>(`/vrms/lookups/${list}`, { name }, { quiet: true });
  return response.data;
}

export async function updateLookupValue(
  list: string,
  id: string,
  change: { name?: string; isActive?: boolean },
): Promise<LookupValue> {
  const response = await api.patch<LookupValue>(`/vrms/lookups/${list}/${id}`, change, { quiet: true });
  return response.data;
}
