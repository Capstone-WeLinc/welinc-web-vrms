import api from './axios';
import type { SystemType } from '../../types';

/** One signed in session, as welinc-auth lists it (spec 0003, AC-31). */
export interface SessionView {
  sid: string;
  kind: 'web' | 'mobile';
  /** "Chrome on Windows", or the name a phone app reported. */
  device: string;
  /** The login client: `portal` or a mobile app such as `vmms-mobile`. */
  client: string;
  /** Each system this session has opened. */
  systems: SystemType[];
  createdAt: string;
  lastActiveAt: string;
  /** Only in your own list: true for the session this tab uses. */
  current?: boolean;
}

/** Your live sessions, newest activity first. */
export async function listMySessions(): Promise<SessionView[]> {
  const response = await api.get<{ sessions: SessionView[] }>('/auth/me/sessions');
  return response.data.sessions;
}

/** Ends one of your own sessions on every system. */
export async function endMySession(sid: string): Promise<void> {
  await api.delete(`/auth/me/sessions/${sid}`);
}

