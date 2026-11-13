import api from './axios';
import { ManagedUser, SystemType, SystemView } from '../../types';

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
  const response = await api.get<ManagedUser[]>('/auth/users', { // check-system: allow AC-33 pending
    params: { system },
  });
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

// Suite spec 0012: password recheck and account deletion

export type DeletionRequestStatus = 'PENDING' | 'CANCELLED' | 'REJECTED' | 'APPROVED' | 'RESTORED' | 'ERASED';

export interface DeletionRequest {
  id: string;
  status: DeletionRequestStatus;
  reason: string | null;
  requestedAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
  /** When the account's personal data is erased; set once approved. */
  eraseAfter: string | null;
  /** Admin routes only. */
  user?: { id: string; name: string; email: string; systems: SystemType[] };
}

/** AC-1: the right password answers a 5 minute, one use token for `purpose`. */
export async function verifyPassword(password: string): Promise<{ reauthToken: string; expiresAt: string }> {
  const response = await api.post<{ reauthToken: string; expiresAt: string }>(
    '/auth/profile/verify-password',
    { password, purpose: 'ACCOUNT_DELETION' },
    { quiet: true },
  );
  return response.data;
}

/** AC-4: uses up the token; the reason is optional (500 characters at most). */
export async function requestAccountDeletion(reauthToken: string, reason: string): Promise<DeletionRequest> {
  const trimmed = reason.trim();
  const response = await api.post<DeletionRequest>(
    '/auth/profile/deletion-request',
    { reauthToken, ...(trimmed ? { reason: trimmed } : {}) },
    { quiet: true },
  );
  return response.data;
}

/** AC-6: your latest request, or null. */
export async function getOwnDeletionRequest(): Promise<DeletionRequest | null> {
  const response = await api.get<{ request: DeletionRequest | null }>('/auth/profile/deletion-request');
  return response.data.request;
}

/** AC-7: cancels a pending request; fine when there is none. */
export async function cancelDeletionRequest(): Promise<void> {
  await api.delete('/auth/profile/deletion-request');
}
