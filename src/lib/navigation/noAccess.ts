import type { UserRole } from '../../types';

/*
  Suite spec 0016 AC-12: opening a page you can't use sends you home with a banner that names the
  page and why. The route guard puts this in router state (`state.noAccess`); the banner reads it.
*/
export type NoAccessNote = {
  /** The page you tried to open, as the sidebar names it ("Analytics"). */
  page: string;
  /** Your role in the plural ("Mechanics"). */
  rolePlural: string;
  /** The page you were sent to ("dashboard"). */
  home: string;
};

const ROLE_PLURALS: Record<string, string> = {
  ADMIN: 'Admins',
  CHIEF_MECHANIC: 'Chief mechanics',
  MECHANIC: 'Mechanics',
  OPERATIONS: 'Operations staff',
  CUSTOMER_SUPPORT: 'Customer support staff',
  DRIVER: 'Drivers',
};

/** A role's plural for the no access note; an unknown role reads as "People with your role". */
export function rolePlural(role: UserRole | string | undefined): string {
  return (role && ROLE_PLURALS[role]) || 'People with your role';
}

export function noAccessNote(page: string, role: UserRole | string | undefined, home = 'dashboard'): NoAccessNote {
  return { page, rolePlural: rolePlural(role), home };
}

/** The banner's line: "That link was for Analytics, which Mechanics can't open." */
export function noAccessLine(note: NoAccessNote): string {
  return `That link was for ${note.page}, which ${note.rolePlural} can't open.`;
}

/** Reads `state.noAccess` from a router location state of any shape. */
export function readNoAccess(state: unknown): NoAccessNote | null {
  if (!state || typeof state !== 'object' || !('noAccess' in state)) return null;
  const note = (state as { noAccess: unknown }).noAccess;
  if (!note || typeof note !== 'object') return null;
  const { page, rolePlural: plural, home } = note as Record<string, unknown>;
  return typeof page === 'string' && typeof plural === 'string' && typeof home === 'string'
    ? { page, rolePlural: plural, home }
    : null;
}
