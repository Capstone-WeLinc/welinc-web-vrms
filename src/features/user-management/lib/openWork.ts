import type { MechanicOption } from '../../../lib/api/vrmsConfigApi';
import type { ManagedUser } from '../../../types';
import { vrmsRoles } from './accountStatus';

/**
 * The first mechanic matched to this user that still has open tickets, or null (spec 0006, AC-16).
 * A mechanic matches on email; one with no email matches on name, and only for a user with the
 * VRMS MECHANIC role. Email is the only key welinc-auth and welinc-backend-vrms share.
 */
export function findMechanicWithOpenWork(user: ManagedUser, mechanics: MechanicOption[]) {
  const email = user.email.trim().toLowerCase();
  const name = user.name.trim().toLowerCase();
  const isMechanic = vrmsRoles(user).includes('MECHANIC');

  const matches = mechanics.filter((mechanic) =>
    mechanic.email != null
      ? mechanic.email.toLowerCase() === email
      : isMechanic && mechanic.name.trim().toLowerCase() === name,
  );
  return matches.find((mechanic) => !mechanic.isAvailable) ?? null;
}
