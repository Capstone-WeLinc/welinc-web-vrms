import { useSyncExternalStore } from 'react';
import { getSystems } from './api/authApi';

// Suite spec 0018 child 0002, AC-35: VRMS role names come from welinc-auth's catalog
// (`GET /auth/systems`, which revalidates with its ETag), so a custom role shows the name a suite
// admin gave it. Read once on load and again when the window regains focus after 60 seconds.
// Until the catalog answers, a code reads in title case ("Chief mechanic" from CHIEF_MECHANIC, and
// a custom C_ code without its prefix). Labels only: nothing decides behaviour by a role.

/** How long a read stays fresh before a focus reads the catalog again. */
export const ROLE_NAMES_TTL_MS = 60_000;

/** welinc-auth's prefix for custom role codes. */
const CUSTOM_PREFIX = 'C_';

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

/** A role code as people read it: the catalog name once loaded, else the code in title case. */
export function roleLabel(role: string): string {
  return names.get(role) ?? titleCase(role);
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
      const vrms = systems.find((system) => system.code === 'VRMS');
      names = new Map((vrms?.roles ?? []).map((role) => [role.code, role.name]));
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

/** `roleLabel` that re-renders the component when the catalog names arrive or change. */
export function useRoleLabel(): (role: string) => string {
  const current = useSyncExternalStore(
    subscribe,
    () => names,
    () => names,
  );
  return (role: string) => current.get(role) ?? titleCase(role);
}

/** Test seam: sets the names as if the catalog had answered, or clears them. */
export function setRoleNamesForTest(next: Record<string, string> | null): void {
  names = new Map(Object.entries(next ?? {}));
  readAt = next ? Date.now() : 0;
  emit();
}
