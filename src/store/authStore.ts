import { create } from 'zustand';
import type { User } from '../types';

/**
 * The signed in person and their access token, in memory only (spec 0003, AC-19): never
 * persisted, never in `localStorage`. `src/lib/session/session.ts` is the only writer of the
 * token; a reload gets a new one through the refresh cookie.
 */
interface AuthState {
  token: string | null;
  /** When the access token runs out, ms since the epoch. */
  expiresAt: number | null;
  /** The session's cutoff as the last refresh reported it (the idle warning reads it). */
  sessionExpiresAt: string | null;
  /** The session's 12 hour end as the last refresh reported it; null when unknown. */
  sessionAbsoluteExpiresAt: string | null;
  user: User | null;
  /** `booting` until the first refresh answers; `unavailable` when welinc-auth can't be reached. */
  status: 'booting' | 'ready' | 'unavailable';
  /** A background refresh couldn't reach the server; the current token is still in use (AC-25). */
  reconnecting: boolean;
  /**
   * The signing out soon banner (suite spec 0016, AC-12): the cutoff it counts down to, whether
   * the session can't be extended (its 12 hour limit), and whether Stay signed in is running.
   * Null when the banner is closed.
   */
  idleWarning: { cutoff: number; cannotExtend: boolean; busy: boolean } | null;
}

export const useAuthStore = create<AuthState>()(() => ({
  token: null,
  expiresAt: null,
  sessionExpiresAt: null,
  sessionAbsoluteExpiresAt: null,
  user: null,
  status: 'booting',
  reconnecting: false,
  idleWarning: null,
}));
