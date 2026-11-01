import { createMongoAbility, type MongoAbility } from '@casl/ability';

/**
 * The permission keys of specs 0011 and 0012, mirroring the backend's `src/auth/permissions/catalog.ts`.
 * The server decides who holds which; the browser only reads the keys `/vrms/permissions/me`
 * sends and the per ticket `can` flags.
 */
export type PermissionKey =
  | 'ticket.view'
  | 'ticket.view_all'
  | 'ticket.create'
  | 'ticket.work'
  | 'ticket.administer'
  | 'ticket.verify'
  | 'ticket.costs.view'
  | 'ticket.costs.edit'
  | 'ticket.assign'
  | 'ticket.unlock'
  | 'ticket.files.add'
  | 'ai.use'
  | 'audit.view'
  | 'analytics.view'
  | 'config.read'
  | 'vehicle.manage'
  | 'knowledge.view'
  | 'knowledge.suggest'
  | 'knowledge.edit'
  | 'users.manage'
  | 'permissions.manage'
  | 'settings.manage'
  | 'lookups.manage';

/** The modules an Admin can switch off (spec 0012). An off module's keys never reach the browser. */
export type ModuleName = 'ai' | 'analytics' | 'knowledge';
export type Modules = Record<ModuleName, boolean>;

export const ALL_MODULES_ON: Modules = { ai: true, analytics: true, knowledge: true };

export const MODULE_LABELS: Record<ModuleName, string> = {
  ai: 'AI',
  analytics: 'Analytics',
  knowledge: 'Knowledge base',
};

/** Only flag rules (`can(key, 'Permission')`): rules with conditions stay on the server (AC-16). */
export type AppAbility = MongoAbility<[PermissionKey, 'Permission']>;

export function buildAbility(keys: readonly string[]): AppAbility {
  return createMongoAbility<AppAbility>(
    keys.map((key) => ({ action: key as PermissionKey, subject: 'Permission' })),
  );
}

// Spec 0011, AC-23
export const PERMISSIONS_REFETCH_MS = 60_000;

/** Fired by the axios instance on any 403, so the permissions refetch at once (AC-23). */
export const FORBIDDEN_EVENT = 'welinc:forbidden';

// Spec 0011, AC-24: one fixed text whatever the body says, at most once per 5 seconds
export const DENIED_MESSAGE = 'You no longer have permission to do that.';
export const DENIED_TOAST_MS = 5_000;
