import api from './axios';

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

export interface MechanicSyncResult {
  created: number;
  updated: number;
  deactivated: number;
}

/**
 * Brings VRMS's in house mechanics in step with welinc-auth (admins only, spec 0009, AC-11).
 * `quiet` skips the global error toasts, for the silent sync on page open (AC-12).
 */
export async function syncMechanics(options: { quiet?: boolean } = {}): Promise<MechanicSyncResult> {
  const response = await api.post<MechanicSyncResult>('/vrms/mechanics/sync', undefined, { quiet: options.quiet });
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

/** What a person still holds in VRMS (users.manage, spec 0011, AC-32). */
export async function getOpenWork(authUserId: string): Promise<OpenWork> {
  const response = await api.get<OpenWork>(`/vrms/mechanics/${authUserId}/open-work`);
  return response.data;
}

export interface ReleaseResult {
  released: number;
  reopened: number;
}

/** Ends the person's assignments after they left VRMS (users.manage, spec 0011, AC-33). */
export async function releaseTickets(authUserId: string, reason: 'DEACTIVATED' | 'ROLE_REMOVED'): Promise<ReleaseResult> {
  const response = await api.post<ReleaseResult>(`/vrms/mechanics/${authUserId}/release-tickets`, { reason }, { quiet: true });
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
