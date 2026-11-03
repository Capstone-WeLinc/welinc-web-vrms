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

function typeName(value: unknown): string {
  if (value && typeof value === 'object' && 'name' in value && typeof value.name === 'string') return value.name;
  return NOT_SET;
}

function statusWord(value: unknown): string {
  return typeof value === 'string' ? statusLabel(value) : NOT_SET;
}

export function describeChange(change: VehicleChange): ChangeEntry {
  const who = change.actorName?.trim() || 'System';
  if (change.field === 'status') {
    return {
      what: 'Status',
      before: statusWord(change.before),
      after: statusWord(change.after),
      who,
      // The Admin's reason, else the ticket behind it, else the ticket was deleted since
      detail: change.note
        ? { kind: 'reason', text: change.note }
        : change.ticket
          ? { kind: 'ticket', ticket: change.ticket }
          : { kind: 'removed' },
    };
  }
  // Type rows never say "Ticket removed"
  return {
    what: change.field === 'vehicleType' ? 'Type' : change.field,
    before: typeName(change.before),
    after: typeName(change.after),
    who,
    detail: change.note ? { kind: 'reason', text: change.note } : null,
  };
}
