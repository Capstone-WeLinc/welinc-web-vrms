import type { ManagedVehicle, ToggleStatus } from '../../../lib/api/vehiclesApi';

// Spec 0020, AC-10 and AC-11: which status actions a Vehicles row offers, and their words.

export type StatusAction = {
  target: ToggleStatus;
  /** The row menu item, and the dialog's confirm button. */
  label: string;
  title: (plate: string) => string;
  destructive: boolean;
};

const DISABLE: StatusAction = {
  target: 'DISABLED',
  label: 'Disable truck',
  title: (plate) => `Disable ${plate}?`,
  destructive: true,
};

const ENABLE: StatusAction = {
  target: 'AVAILABLE',
  label: 'Make available',
  title: (plate) => `Make ${plate} available?`,
  destructive: false,
};

/**
 * Available rows offer Disable, Disabled rows offer Make available. An Under repair row (a stuck
 * truck with no open ticket) offers both; the server has the final say. Under maintenance offers none.
 */
export function statusActions(vehicle: Pick<ManagedVehicle, 'status'>): StatusAction[] {
  switch (vehicle.status) {
    case 'AVAILABLE':
      return [DISABLE];
    case 'DISABLED':
      return [ENABLE];
    case 'UNDER_REPAIR':
      return [ENABLE, DISABLE];
    default:
      return [];
  }
}

export const REASON_MIN = 5;

/** Why a row's status action is off (AC-10), or null when the Admin may toggle it. */
export type StatusBlock =
  | { kind: 'ticket'; ticket: { id: string; repairNumber: string } }
  | { kind: 'maintenance' }
  | null;

export function statusBlock(vehicle: Pick<ManagedVehicle, 'status' | 'openTicket'>): StatusBlock {
  if (vehicle.status === 'UNDER_MAINTENANCE') return { kind: 'maintenance' };
  if (vehicle.openTicket) return { kind: 'ticket', ticket: vehicle.openTicket };
  return null;
}

/** The status action a blocked row shows, disabled: the one its status would offer, else Disable. */
export function blockedAction(vehicle: Pick<ManagedVehicle, 'status'>): StatusAction {
  return vehicle.status === 'DISABLED' ? ENABLE : DISABLE;
}

// ── Status chips, kept in the address as ?status= (AC-12) ──────────────────────────

export const STATUS_CHIPS = ['ALL', 'AVAILABLE', 'UNDER_REPAIR', 'DISABLED'] as const;
export type StatusChip = (typeof STATUS_CHIPS)[number];

/** The chip a `status` param names; anything else (missing, unknown, Under maintenance) is All. */
export function readStatusChip(param: string | null): StatusChip {
  return STATUS_CHIPS.find((chip) => chip !== 'ALL' && chip === param) ?? 'ALL';
}

/** Rows matching both the chip and the search text (already trimmed and lower case). */
export function filterVehicles<T extends Pick<ManagedVehicle, 'plateNumber' | 'model' | 'status' | 'type'>>(
  rows: T[],
  chip: StatusChip,
  needle: string,
): T[] {
  return rows.filter(
    (v) =>
      (chip === 'ALL' || v.status === chip) &&
      (!needle || `${v.plateNumber} ${v.model} ${v.type?.name ?? ''}`.toLowerCase().includes(needle)),
  );
}

/** How many rows each chip would show under the current search. */
export function chipCounts<T extends Pick<ManagedVehicle, 'plateNumber' | 'model' | 'status' | 'type'>>(
  rows: T[],
  needle: string,
): Record<StatusChip, number> {
  const searched = filterVehicles(rows, 'ALL', needle);
  const counts: Record<StatusChip, number> = { ALL: searched.length, AVAILABLE: 0, UNDER_REPAIR: 0, DISABLED: 0 };
  for (const v of searched) if (v.status in counts && v.status !== 'ALL') counts[v.status as StatusChip] += 1;
  return counts;
}
