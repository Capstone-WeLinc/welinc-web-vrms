import type { User } from '../../types';
import { PORTAL_URL } from './session';

/** Switch system shows only with two or more systems (spec 0007, AC-9). */
export function canSwitchSystem(user: Pick<User, 'systems'> | null): boolean {
  return (user?.systems?.length ?? 0) >= 2;
}

/** The portal launcher, with VRMS tagged "You're here" (AC-9, AC-16). */
export function switchSystemUrl(portal: string = PORTAL_URL): string {
  return `${portal.replace(/\/+$/, '')}/?from=VRMS`;
}
