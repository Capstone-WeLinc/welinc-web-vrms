import { useSyncExternalStore } from 'react';
import { getSystems } from './api/authApi';

// Suite spec 0018 child 0002, AC-35: role names come from welinc-auth's catalog
// (`GET /auth/systems`, which revalidates with its ETag), so a custom role shows the name a suite
// admin gave it. Every system's names are kept: the system switcher tags each card with your role
// there (spec 0027, AC-9a). Read once on load and again when the window regains focus after 60 seconds.
// Until the catalog answers, a code reads in title case ("Chief mechanic" from CHIEF_MECHANIC, and
// a custom C_ code without its prefix). Labels only: nothing decides behaviour by a role.

/** How long a read stays fresh before a focus reads the catalog again. */
export const ROLE_NAMES_TTL_MS = 60_000;

/** welinc-auth's prefix for custom role codes. */
const CUSTOM_PREFIX = 'C_';

/** Catalog names keyed `SYSTEM:CODE`. */
let names: ReadonlyMap<string, string> = new Map();
let readAt = 0;
let reading: Promise<void> | null = null;
let focusHooked = false;
const listeners = new Set<() => void>();

/** "Chief mechanic" from CHIEF_MECHANIC, "Tire specialist" from C_TIRE_SPECIALIST. */
export function titleCase(code: string): string {
  const body = code.startsWith(CUSTOM_PREFIX) ? code.slice(CUSTOM_PREFIX.length) : code;
  const words = body.toLowerCase().split('_').filter(Boolean).join(' ');
  return words ? words[0].toUpperCase() + words.slice(1) : code;
}

const nameKey = (system: string, role: string) => `${system}:${role}`;

/** A VRMS role code as people read it: the catalog name once loaded, else the code in title case. */
export function roleLabel(role: string): string {
  return systemRoleLabel('VRMS', role);
}

/** A role code of any system as people read it, by the same rule as `roleLabel`. */
export function systemRoleLabel(system: string, role: string): string {
  return names.get(nameKey(system, role)) ?? titleCase(role);
}

/** "Mechanics", "Tire specialists": the role name for the no access line. */
export function rolePluralLabel(role: string): string {
  const name = roleLabel(role);
  return /s$/i.test(name) ? name : `${name}s`;
}

function emit() {
  for (const listener of listeners) listener();
}

/** Reads the VRMS role names once (concurrent calls share it); a failure keeps what is there. */
export function loadRoleNames(): Promise<void> {
  reading ??= getSystems()
    .then((systems) => {
      names = new Map(
        systems.flatMap((system) => system.roles.map((role) => [nameKey(system.code, role.code), role.name] as const)),
      );
      readAt = Date.now();
      emit();
    })
    .catch(() => {
      // The title case fallback stays; the next focus tries again
    })
    .finally(() => {
      reading = null;
    });
  return reading;
}

function onFocus() {
  if (Date.now() - readAt >= ROLE_NAMES_TTL_MS) void loadRoleNames();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!focusHooked && typeof window !== 'undefined') {
    focusHooked = true;
    window.addEventListener('focus', onFocus);
    void loadRoleNames();
  }
  return () => {
    listeners.delete(listener);
  };
}

function useNames(): ReadonlyMap<string, string> {
  return useSyncExternalStore(
    subscribe,
    () => names,
    () => names,
  );
}

/** `roleLabel` that re-renders the component when the catalog names arrive or change. */
export function useRoleLabel(): (role: string) => string {
  const current = useNames();
  return (role: string) => current.get(nameKey('VRMS', role)) ?? titleCase(role);
}

/** `systemRoleLabel` that re-renders the component when the catalog names arrive or change. */
export function useSystemRoleLabel(): (system: string, role: string) => string {
  const current = useNames();
  return (system: string, role: string) => current.get(nameKey(system, role)) ?? titleCase(role);
}

/**
 * Test seam: sets the names as if the catalog had answered, or clears them. Plain codes are
 * VRMS roles; `SYSTEM:CODE` keys set another system's.
 */
export function setRoleNamesForTest(next: Record<string, string> | null): void {
  names = new Map(Object.entries(next ?? {}).map(([key, name]) => [key.includes(':') ? key : nameKey('VRMS', key), name]));
  readAt = next ? Date.now() : 0;
  emit();
}
