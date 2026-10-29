import api from './axios';
import { CreateUserPayload, ManagedUser, SystemType, UpdateUserPayload } from '../../types';

export async function getCurrentUser(): Promise<ManagedUser> {
  const response = await api.get<ManagedUser>('/auth/me');
  return response.data;
}

export async function getUsers(system: SystemType = 'VRMS'): Promise<ManagedUser[]> {
  const response = await api.get<ManagedUser[]>('/auth/users', {
    params: { system },
  });
  return response.data;
}

export async function createUser(payload: CreateUserPayload): Promise<ManagedUser> {
  const response = await api.post<ManagedUser>('/auth/users', payload);
  return response.data;
}

export async function updateUser(userId: string, payload: UpdateUserPayload): Promise<ManagedUser> {
  const response = await api.patch<ManagedUser>(`/auth/users/${userId}`, payload);
  return response.data;
}

export async function setUserStatus(userId: string, isActive: boolean): Promise<ManagedUser> {
  const response = await api.patch<ManagedUser>(`/auth/users/${userId}/status`, { isActive });
  return response.data;
}

/** Emails a one time reset code. The reply is the same generic message whether or not the account exists. */
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>('/auth/forgot-password', { email });
  return response.data;
}

export async function unlockUser(userId: string): Promise<ManagedUser> {
  const response = await api.patch<ManagedUser>(`/auth/users/${userId}/unlock`);
  return response.data;
}

export async function updateOwnProfile(payload: { name?: string; email?: string; contact?: string }): Promise<ManagedUser> {
  const response = await api.patch<ManagedUser>('/auth/profile', payload);
  return response.data;
}

export async function changeOwnPassword(payload: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<ManagedUser> {
  const response = await api.patch<ManagedUser>('/auth/profile/password', payload);
  return response.data;
}

export interface LookupAccount {
  id: string;
  name: string;
  email: string;
  /** Names of the other systems the account holds a role in. */
  systems: SystemType[];
}

/** Active WeLinc accounts with no VRMS role, by name or email (ADMIN, spec 0011, AC-29). */
export async function lookupAccounts(q: string, signal?: AbortSignal): Promise<LookupAccount[]> {
  const response = await api.get<LookupAccount[]>('/auth/users/lookup', { params: { q }, signal });
  return response.data;
}
