import type { MechanicOption } from '../../../lib/api/vrmsConfigApi';

/** A name as people would compare it: spacing and case ignored. */
export function nameKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** The names more than one mechanic has. Only their rows must show the email to tell them apart. */
export function sharedNames(list: readonly Pick<MechanicOption, 'name'>[]): Set<string> {
  const seen = new Set<string>();
  const shared = new Set<string>();
  for (const { name } of list) {
    const key = nameKey(name);
    if (seen.has(key)) shared.add(key);
    seen.add(key);
  }
  return shared;
}

/**
 * The picker's second text: the open count, and the email too for a row whose name another
 * mechanic shares (`shared`, from sharedNames). Every other row stays short; its email is the
 * row's hover title instead.
 */
export function mechanicDescription(m: Pick<MechanicOption, 'name' | 'openCount' | 'email'>, shared: ReadonlySet<string>): string {
  return m.email && shared.has(nameKey(m.name)) ? `${m.openCount} open, ${m.email}` : `${m.openCount} open`;
}

/** Least loaded first: fewest open tickets, then by name (spec 0016, AC-14). */
export function sortMechanics(list: MechanicOption[]): MechanicOption[] {
  return [...list].sort((a, b) => a.openCount - b.openCount || a.name.localeCompare(b.name));
}
