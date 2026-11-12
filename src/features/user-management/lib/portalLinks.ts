import { PORTAL_URL } from '../../../lib/session/session';

// Suite spec 0013, AC-31: account actions live in the portal's Admin section, scoped to VRMS.

const base = () => PORTAL_URL.replace(/\/+$/, '');

/** One person's account page in the portal, for VRMS. */
export function manageAccountUrl(userId: string): string {
  return `${base()}/admin/people/${encodeURIComponent(userId)}?system=VRMS`;
}

/** The portal's Add person form with VRMS picked. */
export function addUserUrl(): string {
  return `${base()}/admin/people/new?system=VRMS`;
}
