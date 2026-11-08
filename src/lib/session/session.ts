import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import api from '../api/axios';
import { showToast } from '../../context/toast';
import { useAuthStore } from '../../store/authStore';
import type { User, UserRole, UserRoleAssignment } from '../../types';
import { afterBootRefused, BOOT_FLAG, refreshDelayMs, returnPath } from './bootGuard';

/**
 * The VRMS web session (spec 0001 section 7, spec 0003 AC-19 to AC-21). The access token lives in
 * memory only; the refresh cookie (`vrms_rt`) is HttpOnly on `/vrms/session`, so no script here
 * ever sees it. Nothing about the session is kept in `localStorage`.
 */

export const PORTAL_URL = import.meta.env.VITE_PORTAL_URL || 'http://localhost:8000';
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const LOCK_NAME = 'vrms-refresh';
const CHANNEL_NAME = 'vrms-session';
/** A token good for longer than this is fresh enough to skip a refresh (AC-21). */
const FRESH_MS = 60_000;
/** Until milestone 2 adds the full Reconnecting schedule, a failed background refresh retries here. */
const RETRY_MS = 15_000;
/** Long enough to read why the page is leaving. */
const LEAVE_DELAY_MS = 2_500;
/** What an older VRMS kept in localStorage, removed on the first load after the switch. */
const LEGACY_KEYS = ['welinc_token', 'welinc_user', 'welinc_last_active', 'welinc-auth-storage'];

declare module 'axios' {
  interface AxiosRequestConfig {
    /** A call to /vrms/session itself: the cookie goes along, the 401 handling below stays out. */
    sessionCall?: boolean;
    /** Set once a call was retried after a refresh, so it is never retried twice (AC-21). */
    retriedAfterRefresh?: boolean;
  }
}

type RefreshAnswer = {
  accessToken: string;
  expiresIn: number;
  sessionExpiresAt: string;
  user: { id: string; name: string; email: string; roles: UserRoleAssignment[] };
};

type TokenMessage = {
  type: 'token';
  accessToken: string;
  expiresAt: number;
  sessionExpiresAt: string;
  user: User;
};

export type RefreshOutcome = 'ok' | 'ended' | 'no_access' | 'unavailable';

const channel: BroadcastChannel | null =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);
let timer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<RefreshOutcome> | null = null;
let leaving = false;

function toUser(answer: RefreshAnswer['user']): User {
  const vrms = answer.roles.find((r) => r.system === 'VRMS');
  return {
    id: answer.id,
    name: answer.name,
    email: answer.email,
    role: (vrms?.role ?? 'MECHANIC') as UserRole,
    system: 'VRMS',
    roles: answer.roles,
  };
}

function apply(message: Omit<TokenMessage, 'type'>) {
  useAuthStore.setState({
    token: message.accessToken,
    expiresAt: message.expiresAt,
    sessionExpiresAt: message.sessionExpiresAt,
    user: message.user,
    status: 'ready',
  });
  schedule(refreshDelayMs(message.expiresAt, Date.now()));
}

function schedule(delayMs: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void backgroundRefresh(), delayMs);
}

/** Leaves for the portal, once, saying why first. The token is dropped at once. */
function leave(url: string, message?: string) {
  if (leaving) return;
  leaving = true;
  if (timer) clearTimeout(timer);
  useAuthStore.setState({ token: null, expiresAt: null });
  if (message) showToast(message, 'error');
  setTimeout(() => window.location.assign(url), message ? LEAVE_DELAY_MS : 0);
}

const noAccessUrl = () => `${PORTAL_URL}/?error=NO_SYSTEM_ACCESS&system=VRMS`;

async function callRefresh(): Promise<RefreshOutcome> {
  try {
    const { data } = await api.post<RefreshAnswer>('/vrms/session/refresh', {}, {
      withCredentials: true,
      sessionCall: true,
      quiet: true,
    });
    const message: TokenMessage = {
      type: 'token',
      accessToken: data.accessToken,
      expiresAt: Date.now() + data.expiresIn * 1000,
      sessionExpiresAt: data.sessionExpiresAt,
      user: toUser(data.user),
    };
    apply(message);
    // Other VRMS tabs take this token instead of refreshing themselves; same origin, memory only
    channel?.postMessage(message);
    return 'ok';
  } catch (error) {
    const response = (error as AxiosError<{ code?: string }>).response;
    if (response?.status === 401) return 'ended';
    if (response?.status === 403 && response.data?.code === 'NO_SYSTEM_ACCESS') return 'no_access';
    return 'unavailable';
  }
}

/**
 * One refresh at a time across every VRMS tab, under the Web Lock `vrms-refresh` (AC-21). A tab
 * that waited for the lock first checks whether another tab already handed it a token good for
 * more than 60 s. `stale` is a token the server just called expired: never good enough to skip.
 */
export function refresh(stale?: string): Promise<RefreshOutcome> {
  if (inFlight) return inFlight;
  const work = (): Promise<RefreshOutcome> => {
    const { token, expiresAt } = useAuthStore.getState();
    if (token && token !== stale && expiresAt && expiresAt - Date.now() > FRESH_MS) {
      return Promise.resolve('ok');
    }
    return callRefresh();
  };
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  // locks.request resolves with the callback's own result (the DOM typing nests the promise)
  const run = locks ? (locks.request(LOCK_NAME, work) as unknown as Promise<RefreshOutcome>) : work();
  const shared = run.finally(() => {
    inFlight = null;
  });
  inFlight = shared;
  return shared;
}

async function backgroundRefresh() {
  const outcome = await refresh();
  if (outcome === 'ended') leave(`${PORTAL_URL}/login`, 'Your session has ended. Sign in again.');
  else if (outcome === 'no_access') leave(noAccessUrl());
  else if (outcome === 'unavailable') schedule(RETRY_MS);
}

/**
 * The boot sequence (spec 0001 section 7, AC-20): refresh; on 401 go to `start` once with the
 * flag set; still 401 after coming back, give up and show the portal's error.
 */
export async function boot(): Promise<void> {
  try {
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  } catch {
    // storage may be blocked; there is nothing to clean then
  }
  useAuthStore.setState({ status: 'booting' });
  const outcome = await refresh();
  if (outcome === 'ok') {
    sessionStorage.removeItem(BOOT_FLAG);
    return;
  }
  if (outcome === 'no_access') return leave(noAccessUrl());
  if (outcome === 'unavailable') {
    useAuthStore.setState({ status: 'unavailable' });
    return;
  }
  if (afterBootRefused(sessionStorage.getItem(BOOT_FLAG), Date.now()) === 'give_up') {
    sessionStorage.removeItem(BOOT_FLAG);
    return leave(`${PORTAL_URL}/?error=LOGIN_FAILED`);
  }
  sessionStorage.setItem(BOOT_FLAG, String(Date.now()));
  const back = encodeURIComponent(returnPath(window.location));
  window.location.assign(`${API_URL}/vrms/session/start?return=${back}`);
}

/**
 * Signs out of this tab and opens the portal's form (AC-24). Milestone 2 replaces this with
 * `POST /vrms/session/logout`, which ends the session on the server for every system.
 */
export function signOut() {
  leave(`${PORTAL_URL}/login?reason=logout`);
}

/** Another tab refreshed: take its token (AC-21). */
channel?.addEventListener('message', (event: MessageEvent<TokenMessage>) => {
  if (event.data?.type === 'token' && !leaving) apply(event.data);
});

// Every call but the session's own carries the in memory token
api.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (token && !config.sessionCall) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// AC-21: an expired token refreshes once and retries the call once; an ended session leaves
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ code?: string }>) => {
    const config = error.config as InternalAxiosRequestConfig | undefined;
    if (!config || config.sessionCall || error.response?.status !== 401) {
      return Promise.reject(error);
    }
    if (error.response.data?.code === 'TOKEN_EXPIRED' && !config.retriedAfterRefresh) {
      const sent = String(config.headers.Authorization ?? '').replace(/^Bearer /, '');
      const outcome = await refresh(sent);
      if (outcome === 'ok') {
        config.retriedAfterRefresh = true;
        config.headers.Authorization = `Bearer ${useAuthStore.getState().token}`;
        return api(config);
      }
      if (outcome === 'unavailable') return Promise.reject(error);
    }
    leave(`${PORTAL_URL}/login`, 'Your session has ended. Sign in again.');
    return Promise.reject(error);
  },
);
