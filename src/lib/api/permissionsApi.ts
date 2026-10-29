import api from './axios';

export interface MyPermissions {
  keys: string[];
  version: number | null;
}

/** The caller's granted keys and the matrix version (spec 0011, AC-16). */
export async function getMyPermissions(): Promise<MyPermissions> {
  // Quiet: the shell shows its own error state with Retry instead of a toast
  const response = await api.get<MyPermissions>('/vrms/permissions/me', { quiet: true });
  return response.data;
}
