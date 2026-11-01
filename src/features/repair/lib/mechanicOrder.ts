import type { MechanicOption } from '../../../lib/api/vrmsConfigApi';

/** Least loaded first: fewest open tickets, then by name (spec 0016, AC-14). */
export function sortMechanics(list: MechanicOption[]): MechanicOption[] {
  return [...list].sort((a, b) => a.openCount - b.openCount || a.name.localeCompare(b.name));
}
