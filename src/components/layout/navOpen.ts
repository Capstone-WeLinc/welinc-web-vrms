// Spec 0027, AC-3: which pages with sub pages are open, kept per user in this browser as a JSON
// array of parent paths (`["/repairs"]`). Anything that isn't a list of strings reads as none,
// and a storage read or write that throws is ignored.

export function navOpenKey(userId: string) {
  return `welinc:nav-open:${userId}`;
}

export function parseNavOpen(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
  } catch {
    return [];
  }
}

export function readNavOpen(key: string | null): string[] {
  if (!key) return [];
  try {
    return parseNavOpen(localStorage.getItem(key));
  } catch {
    return [];
  }
}

export function writeNavOpen(key: string | null, open: readonly string[]) {
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(open));
  } catch {
    // Storage blocked (private mode): the groups just aren't remembered.
  }
}

/** Opens or closes one parent, keeping the order the rest were opened in. */
export function toggled(open: readonly string[], parent: string, next: boolean): string[] {
  const rest = open.filter((entry) => entry !== parent);
  return next ? [...rest, parent] : rest;
}
