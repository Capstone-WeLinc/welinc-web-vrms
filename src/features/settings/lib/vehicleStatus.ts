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
