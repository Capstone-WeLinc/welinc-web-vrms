import { statusLabel } from '../../../components/shared/statusLabels';
import type { VehicleChange } from '../../../lib/api/vehiclesApi';

// Spec 0020, AC-13: one History entry in plain words.

export type ChangeDetail =
  | { kind: 'reason'; text: string }
  | { kind: 'ticket'; ticket: { id: string; repairNumber: string } }
  | { kind: 'removed' }
  | null;

export type ChangeEntry = {
  what: string;
  before: string;
  after: string;
  who: string;
  detail: ChangeDetail;
};

const NOT_SET = 'Not set';

/** The sync writes these (spec 0029, AC-3); `status` and `vehicleType` have their own words. */
const FIELD_NAMES: Record<string, string> = {
  plateNumber: 'Plate',
  model: 'Model',
  make: 'Make',
  capacity: 'Capacity',
  truckSizeCategory: 'Size',
  garage: 'Garage',
  isActive: 'In VMMS',
  vehicleType: 'Type',
};

/** The actor the fleet sync writes (spec 0029, AC-3). */
export const FLEET_ACTOR = 'VMMS';

function valueWord(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return NOT_SET;
  if (typeof value === 'object' && 'name' in value && typeof value.name === 'string') return value.name;
  if (field === 'isActive' && typeof value === 'boolean') return value ? 'In the fleet' : 'Removed in VMMS';
  if (field === 'capacity' && typeof value === 'number') return `${value.toLocaleString()} kg`;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return NOT_SET;
}

function statusWord(value: unknown): string {
  return typeof value === 'string' ? statusLabel(value) : NOT_SET;
}

export function describeChange(change: VehicleChange): ChangeEntry {
  const who = change.actorName?.trim() || 'System';
  const fromSync = who === FLEET_ACTOR;
  if (change.field === 'status') {
    return {
      what: 'Status',
      before: statusWord(change.before),
      after: statusWord(change.after),
      who,
      // The Admin's reason, else the ticket behind it, else the ticket was deleted since. A sync
      // row has neither, and never had a ticket
      detail: change.note
        ? { kind: 'reason', text: change.note }
        : change.ticket
          ? { kind: 'ticket', ticket: change.ticket }
          : fromSync
            ? null
            : { kind: 'removed' },
    };
  }
  // Other rows never say "Ticket removed"
  return {
    what: FIELD_NAMES[change.field] ?? change.field,
    before: valueWord(change.field, change.before),
    after: valueWord(change.field, change.after),
    who,
    detail: change.note ? { kind: 'reason', text: change.note } : null,
  };
}
