import type { MechanicOption } from '../../../lib/api/vrmsConfigApi';
import type { ManagedUser } from '../../../types';

/**
 * The mechanic linked to this user if they still have open tickets, or null (spec 0006, AC-16).
 * Matched by the welinc-auth id only (spec 0009, AC-9).
 */
export function findMechanicWithOpenWork(user: ManagedUser, mechanics: MechanicOption[]) {
  return mechanics.find((mechanic) => mechanic.authUserId === user.id && !mechanic.isAvailable) ?? null;
}
