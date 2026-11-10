import api from './axios';
import { CreateUserPayload, ManagedUser, SystemType, SystemView, UpdateUserPayload } from '../../types';

/** `/auth/me`: the profile plus the address of a pending email change, or null (suite spec 0009, AC-20). */
export type CurrentUser = ManagedUser & { pendingEmail: string | null };

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await api.get<CurrentUser>('/auth/me');
  return response.data;
}

/** A started email change (AC-17). `users.email` stays the same until the code is used. */
export interface PendingEmailChange {
  pendingEmail: string;
  expiresAt: string;
  resendAfter: number;
}

/** Starts a change of your own email, or resends the code when `newEmail` is the pending one (AC-17, AC-19). */
export async function startEmailChange(payload: { newEmail: string; currentPassword: string }): Promise<PendingEmailChange> {
  const response = await api.post<PendingEmailChange>('/auth/profile/email', payload);
  return response.data;
}

/** The code sent to the new address; the answer is your profile with the new email (AC-18). */
export async function verifyEmailChange(code: string): Promise<ManagedUser> {
  const response = await api.post<ManagedUser>('/auth/profile/email/verify', { code });
  return response.data;
}

/** Drops a pending email change; fine when there is none (AC-19). */
export async function cancelEmailChange(): Promise<void> {
  await api.delete('/auth/profile/email');
}

/** Every system's roles in display order; public and cached for a minute (spec 0004, AC-16). */
export async function getSystems(): Promise<SystemView[]> {
  const response = await api.get<{ systems: SystemView[] }>('/auth/systems');
  return response.data.systems;
}

export async function getUsers(system: SystemType = 'VRMS'): Promise<ManagedUser[]> {
  const response = await api.get<ManagedUser[]>('/auth/users', {
    params: { system },
  });
  return response.data;
}

/**
 * An admin save's answer. `setupEmailSent` comes back when a setup code was due: on create, and
 * on an email change while setup is pending (suite spec 0009, AC-21); false means it wasn't sent.
 */
export type SavedUser = ManagedUser & { setupEmailSent?: boolean };

export async function createUser(payload: CreateUserPayload): Promise<SavedUser> {
  const response = await api.post<SavedUser>('/auth/users', payload);
  return response.data;
}

export async function updateUser(userId: string, payload: UpdateUserPayload): Promise<SavedUser> {
  const response = await api.patch<SavedUser>(`/auth/users/${userId}`, payload);
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

/** Name and contact only: your email changes through `startEmailChange` (suite spec 0009, AC-20). */
export async function updateOwnProfile(payload: { name?: string; contact?: string }): Promise<ManagedUser> {
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
