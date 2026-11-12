import api from './axios';
import type { Modules } from '../permissions/keys';

// Suite spec 0013, AC-30: the matrix is edited in the portal's Admin section (welinc-auth) and
// synced into VRMS, so the app reads only the caller's own keys here.

export interface MyPermissions {
  keys: string[];
  version: number | null;
  modules: Modules;
}

/** The caller's granted keys, the matrix version and which modules are on (spec 0011, AC-16; spec 0012, AC-12). */
export async function getMyPermissions(): Promise<MyPermissions> {
  // Quiet: the shell shows its own error state with Retry instead of a toast
  const response = await api.get<MyPermissions>('/vrms/permissions/me', { quiet: true });
  return response.data;
}
