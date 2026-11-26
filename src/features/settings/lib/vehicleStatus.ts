import type { ManagedVehicle } from '../../../lib/api/vehiclesApi';

// Spec 0020, AC-12, and spec 0029, AC-4: the Vehicles list's status chips (kept in ?status=) and
// search. The statuses are VMMS's; VRMS no longer sets any.

export const STATUS_CHIPS = ['ALL', 'AVAILABLE', 'UNDER_REPAIR', 'UNDER_MAINTENANCE'] as const;
export type StatusChip = (typeof STATUS_CHIPS)[number];

type Searchable = Pick<ManagedVehicle, 'plateNumber' | 'model' | 'make' | 'truckSizeCategory' | 'status' | 'garage'>;

/** The chip a `status` param names; anything else (missing, unknown) is All. */
export function readStatusChip(param: string | null): StatusChip {
  return STATUS_CHIPS.find((chip) => chip !== 'ALL' && chip === param) ?? 'ALL';
}

/** Rows matching both the chip and the search text (already trimmed and lower case). */
export function filterVehicles<T extends Searchable>(rows: T[], chip: StatusChip, needle: string): T[] {
  return rows.filter(
    (v) =>
      (chip === 'ALL' || v.status === chip) &&
      (!needle ||
        [v.plateNumber, v.make, v.model, v.truckSizeCategory, v.garage?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(needle)),
  );
}

/** How many rows each chip would show under the current search. */
export function chipCounts<T extends Searchable>(rows: T[], needle: string): Record<StatusChip, number> {
  const searched = filterVehicles(rows, 'ALL', needle);
  const counts: Record<StatusChip, number> = { ALL: searched.length, AVAILABLE: 0, UNDER_REPAIR: 0, UNDER_MAINTENANCE: 0 };
  for (const v of searched) if (v.status in counts && v.status !== 'ALL') counts[v.status as StatusChip] += 1;
  return counts;
}

/** The newest `syncedAt` in the list: when VRMS last heard from VMMS about any truck. */
export function lastSynced(rows: Pick<ManagedVehicle, 'syncedAt'>[]): string | null {
  let newest: string | null = null;
  for (const { syncedAt } of rows) if (syncedAt && (!newest || syncedAt > newest)) newest = syncedAt;
  return newest;
}

/** "Make Model", without repeating a make VMMS already put at the start of the model. */
export function makeAndModel(v: Pick<ManagedVehicle, 'make' | 'model'>): string {
  const make = v.make?.trim();
  if (!make || v.model.toLowerCase().startsWith(make.toLowerCase())) return v.model;
  return `${make} ${v.model}`;
}
