import type { MechanicOption } from '../../../lib/api/vrmsConfigApi';

/** The picker's second line: open count, and the email so two people with one name stay apart. */
export function mechanicDescription(m: Pick<MechanicOption, 'openCount' | 'email'>): string {
  return m.email ? `${m.openCount} open · ${m.email}` : `${m.openCount} open`;
}

/** Least loaded first: fewest open tickets, then by name (spec 0016, AC-14). */
export function sortMechanics(list: MechanicOption[]): MechanicOption[] {
  return [...list].sort((a, b) => a.openCount - b.openCount || a.name.localeCompare(b.name));
}
