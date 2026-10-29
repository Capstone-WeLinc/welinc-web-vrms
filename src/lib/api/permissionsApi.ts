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

export interface MatrixGrant {
  allowed: boolean;
  locked: boolean;
}

export interface MatrixKey {
  key: string;
  label: string;
  description: string;
  grants: Record<string, MatrixGrant>;
}

export interface PermissionMatrix {
  roles: { role: string; label: string }[];
  groups: { name: string; keys: MatrixKey[] }[];
  version: number;
}

export interface PermissionChange {
  id: string;
  role: string;
  permission: string;
  /** Null when the row was added. */
  before: boolean | null;
  /** Null when the row was removed. */
  after: boolean | null;
  /** Null for System (the startup backfill or a prune). */
  actorName: string | null;
  actorEmail: string | null;
  note: string | null;
  createdAt: string;
}

/** Every role against every key, with locks (spec 0011, AC-17). Needs permissions.manage. */
export async function getPermissionMatrix(): Promise<PermissionMatrix> {
  const response = await api.get<PermissionMatrix>('/vrms/permissions', { quiet: true });
  return response.data;
}

/** The newest matrix changes first (AC-19). */
export async function getPermissionChanges(limit: number): Promise<{ data: PermissionChange[]; nextCursor: string | null }> {
  const response = await api.get<{ data: PermissionChange[]; nextCursor: string | null }>('/vrms/permissions/changes', {
    params: { limit },
    quiet: true,
  });
  return response.data;
}
