import { createMongoAbility, type MongoAbility } from '@casl/ability';

/**
 * The permission keys of spec 0011, mirroring the backend's `src/auth/permissions/catalog.ts`.
 * The server decides who holds which; the browser only reads the keys `/vrms/permissions/me`
 * sends and the per ticket `can` flags.
 */
export type PermissionKey =
  | 'ticket.view'
  | 'ticket.view_all'
  | 'ticket.create'
  | 'ticket.work'
  | 'ticket.administer'
  | 'ticket.costs.view'
  | 'ticket.costs.edit'
  | 'ticket.unlock'
  | 'audit.view'
  | 'config.read'
  | 'knowledge.view'
  | 'knowledge.suggest'
  | 'knowledge.edit'
  | 'users.manage'
  | 'permissions.manage';

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
