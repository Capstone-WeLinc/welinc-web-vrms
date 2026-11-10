import type { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import api from '../api/axios';
import { showToast } from '../../context/toast';
import { useAuthStore } from '../../store/authStore';
import type { User, UserRole, UserRoleAssignment } from '../../types';
import { afterBootRefused, BOOT_FLAG, refreshDelayMs, returnPath } from './bootGuard';
import {
  activityDelayMs,
  afterStatus,
  reconnectDelayMs,
  STATUS_RETRY_MS,
  statusCheckDelayMs,
} from './timing';

/**
 * The VRMS web session (spec 0001 section 7, spec 0003 AC-19 to AC-25). The access token lives in
 * memory only; the refresh cookie (`vrms_rt`) is HttpOnly on `/vrms/session`, so no script here
 * ever sees it. Nothing about the session is kept in `localStorage`.
 */

export const PORTAL_URL = import.meta.env.VITE_PORTAL_URL;
const API_URL = import.meta.env.VITE_API_BASE_URL;
const LOCK_NAME = 'vrms-refresh';
const CHANNEL_NAME = 'vrms-session';
/** A token good for longer than this is fresh enough to skip a refresh (AC-21). */
const FRESH_MS = 60_000;
/** Long enough to read why the page is leaving. */
const LEAVE_DELAY_MS = 2_500;
/** What an older VRMS kept in localStorage, removed on the first load after the switch. */
const LEGACY_KEYS = ['welinc_token', 'welinc_user', 'welinc_last_active', 'welinc-auth-storage'];
/** Real input only (AC-22): never pointer moves, scrolls by script, polling or timers. */
const INPUT_EVENTS = ['keydown', 'pointerdown', 'touchstart', 'wheel'] as const;
const ENDED_MESSAGE = 'Your session has ended. Sign in again.';

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
  sessionAbsoluteExpiresAt?: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    roles: UserRoleAssignment[];
    /** Missing from an older welinc-auth: counts as none (spec 0007, AC-8). */
    systems?: string[];
  };
};

type TokenMessage = {
  type: 'token';
  accessToken: string;
  expiresAt: number;
  sessionExpiresAt: string;
  sessionAbsoluteExpiresAt: string | null;
  user: User;
};

/** What travels on the `vrms-session` channel: a new token, a logout, or a session kept alive. */
type ChannelMessage = TokenMessage | { type: 'logout' } | { type: 'extended' };

export type RefreshOutcome = 'ok' | 'ended' | 'no_access' | 'unavailable';
type CallOutcome<T> = { kind: 'ok'; data: T } | { kind: 'ended' } | { kind: 'unavailable' };

const channel: BroadcastChannel | null =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let pingTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<RefreshOutcome> | null = null;
let leaving = false;
let reconnectAttempt = 0;
let lastPingAt = 0;
let listening = false;

const loginUrl = (reason?: 'idle' | 'maxage' | 'logout') =>
  reason ? `${PORTAL_URL}/login?reason=${reason}` : `${PORTAL_URL}/login`;
/**
 * True when this cutoff is the session's 12 hour end, not its idle one (AC-23): nothing can
 * extend it, and the portal says so (`reason=maxage`). A second of slack covers rounding.
 */
function isMaxAge(cutoff: number): boolean {
  const end = Date.parse(useAuthStore.getState().sessionAbsoluteExpiresAt ?? '');
  return Number.isFinite(end) && cutoff >= end - 1000;
}

/** Where a tab goes when its session ran out: `maxage` at the 12 hour end, else `idle`. */
const endedUrl = (cutoff: number) => loginUrl(isMaxAge(cutoff) ? 'maxage' : 'idle');

const noAccessUrl = () => `${PORTAL_URL}/?error=NO_SYSTEM_ACCESS&system=VRMS`;

function toUser(answer: RefreshAnswer['user']): User {
  const vrms = answer.roles.find((r) => r.system === 'VRMS');
  return {
    id: answer.id,
    name: answer.name,
    email: answer.email,
    role: (vrms?.role ?? 'MECHANIC') as UserRole,
    system: 'VRMS',
    roles: answer.roles,
    systems: Array.isArray(answer.systems) ? answer.systems : [],
  };
}

function apply(message: Omit<TokenMessage, 'type'>) {
  reconnectAttempt = 0;
  useAuthStore.setState({
    token: message.accessToken,
    expiresAt: message.expiresAt,
    sessionExpiresAt: message.sessionExpiresAt,
    sessionAbsoluteExpiresAt: message.sessionAbsoluteExpiresAt,
    user: message.user,
    status: 'ready',
    reconnecting: false,
  });
  scheduleRefresh(refreshDelayMs(message.expiresAt, Date.now()));
  watchIdle();
}

function scheduleRefresh(delayMs: number) {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => void backgroundRefresh(), delayMs);
}

function clearTimers() {
  for (const timer of [refreshTimer, idleTimer, pingTimer]) if (timer) clearTimeout(timer);
  refreshTimer = idleTimer = pingTimer = null;
}

/** Leaves for the portal, once, saying why first. The token is dropped at once. */
function leave(url: string, message?: string) {
  if (leaving) return;
  leaving = true;
  clearTimers();
  useAuthStore.setState({ token: null, expiresAt: null, idleWarning: null, reconnecting: false });
  if (message) showToast(message, 'error');
  setTimeout(() => window.location.assign(url), message ? LEAVE_DELAY_MS : 0);
}

/** A call that needs the access token but must not trigger the global 401 handling. */
function withToken(config: AxiosRequestConfig = {}): AxiosRequestConfig {
  const { token } = useAuthStore.getState();
  return {
    ...config,
    withCredentials: true,
    sessionCall: true,
    quiet: true,
    headers: { ...config.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  };
}

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
      sessionAbsoluteExpiresAt: data.sessionAbsoluteExpiresAt ?? null,
      user: toUser(data.user),
    };
    apply(message);
    // Other VRMS tabs take this token instead of refreshing themselves; same origin, memory only
    channel?.postMessage(message satisfies ChannelMessage);
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

/**
 * The server can't be reached (AC-25): keep the current token until it expires, show the quiet
 * banner, and retry at 5, 15 and 30 s, then every 30 s. Once the token has expired too, leave.
 */
function reconnect() {
  const { expiresAt } = useAuthStore.getState();
  if (!expiresAt || expiresAt <= Date.now()) {
    leave(loginUrl(), "Can't reach the sign in service, and your sign in has run out. Sign in again.");
    return;
  }
  useAuthStore.setState({ reconnecting: true });
  scheduleRefresh(reconnectDelayMs(reconnectAttempt));
  reconnectAttempt += 1;
}

function afterRefresh(outcome: RefreshOutcome) {
  if (outcome === 'ended') leave(loginUrl(), ENDED_MESSAGE);
  else if (outcome === 'no_access') leave(noAccessUrl());
  else if (outcome === 'unavailable') reconnect();
}

async function backgroundRefresh() {
  // A reconnect retry always asks the server: the token it holds is the one that couldn't renew
  const { reconnecting, token } = useAuthStore.getState();
  afterRefresh(await refresh(reconnecting ? (token ?? undefined) : undefined));
}

/** A call with the in memory token that refreshes once on `TOKEN_EXPIRED` (AC-21). */
async function sessionRequest<T>(run: () => Promise<{ data: T }>, retried = false): Promise<CallOutcome<T>> {
  try {
    const { data } = await run();
    return { kind: 'ok', data };
  } catch (error) {
    const response = (error as AxiosError<{ code?: string }>).response;
    if (response?.status === 401) {
      if (response.data?.code === 'TOKEN_EXPIRED' && !retried) {
        const outcome = await refresh(useAuthStore.getState().token ?? undefined);
        if (outcome === 'ok') return sessionRequest(run, true);
        if (outcome === 'unavailable') return { kind: 'unavailable' };
      }
      return { kind: 'ended' };
    }
    return { kind: 'unavailable' };
  }
}

// ---------------------------------------------------------------------------------------------
// The idle watch (AC-23)

/** Asks the server when the session ends; work in another tab or system may have moved it. */
function fetchStatus() {
  return sessionRequest(() => api.get<{ sessionExpiresAt: string }>('/vrms/session/status', withToken()));
}

/** Plans the status check 60 s before the cutoff this tab knows. Leaves an open warning alone. */
function watchIdle() {
  const { sessionExpiresAt, idleWarning } = useAuthStore.getState();
  if (leaving || idleWarning || !sessionExpiresAt) return;
  const cutoff = Date.parse(sessionExpiresAt);
  if (!Number.isFinite(cutoff)) return;
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => void checkIdle(), statusCheckDelayMs(cutoff, Date.now()));
}

/**
 * The status check: a later cutoff reschedules quietly and closes an open warning; otherwise the
 * warning opens (or stays), and once its cutoff has passed the tab leaves with `reason=idle`, or
 * `reason=maxage` when the cutoff was the 12 hour end.
 */
async function checkIdle() {
  idleTimer = null;
  const result = await fetchStatus();
  if (leaving) return;
  if (result.kind === 'ended') return leave(endedUrl(useAuthStore.getState().idleWarning?.cutoff ?? Date.now()));
  if (result.kind === 'unavailable') {
    idleTimer = setTimeout(() => void checkIdle(), STATUS_RETRY_MS);
    return;
  }
  const cutoff = Date.parse(result.data.sessionExpiresAt);
  const now = Date.now();
  useAuthStore.setState({ sessionExpiresAt: result.data.sessionExpiresAt });
  if (afterStatus(cutoff, now) === 'reschedule') {
    useAuthStore.setState({ idleWarning: null });
    watchIdle();
    return;
  }
  if (cutoff <= now) return leave(endedUrl(cutoff));
  const open = useAuthStore.getState().idleWarning;
  useAuthStore.setState({
    idleWarning: {
      cutoff,
      // Known from the refresh answer, so the 12 hour warning says so from the start
      cannotExtend: (open?.cannotExtend ?? false) || isMaxAge(cutoff),
      busy: false,
      dismissed: open?.dismissed ?? false,
    },
  });
  // At the cutoff, ask once more: work elsewhere in the last minute still keeps the session
  idleTimer = setTimeout(() => void checkIdle(), cutoff - now);
}

/**
 * **Keep working** on the 12 hour warning (AC-23): nothing can extend the session, so the dialog
 * just closes and a banner keeps counting down. The tab still leaves at the cutoff.
 */
export function keepWorking() {
  const open = useAuthStore.getState().idleWarning;
  if (open?.cannotExtend) useAuthStore.setState({ idleWarning: { ...open, dismissed: true } });
}

/** **Stay signed in** (AC-23): an activity ping, then the status again. */
export async function staySignedIn() {
  const open = useAuthStore.getState().idleWarning;
  if (!open || open.busy) return;
  useAuthStore.setState({ idleWarning: { ...open, busy: true } });
  const ping = await sendActivity();
  if (ping === 'ended') return leave(endedUrl(open.cutoff));
  const result = await fetchStatus();
  if (leaving) return;
  if (result.kind === 'ended') return leave(endedUrl(open.cutoff));
  if (result.kind === 'ok' && afterStatus(Date.parse(result.data.sessionExpiresAt), Date.now()) === 'reschedule') {
    useAuthStore.setState({ sessionExpiresAt: result.data.sessionExpiresAt, idleWarning: null });
    channel?.postMessage({ type: 'extended' } satisfies ChannelMessage);
    watchIdle();
    return;
  }
  // The ping counted but the cutoff didn't move: the 12 hour limit, which nothing extends
  const current = useAuthStore.getState().idleWarning;
  if (current) {
    useAuthStore.setState({
      idleWarning: { ...current, busy: false, cannotExtend: result.kind === 'ok' },
    });
  }
  if (result.kind === 'unavailable') showToast("Couldn't reach the sign in service. Try again.", 'error');
}

// ---------------------------------------------------------------------------------------------
// The activity pinger (AC-22)

function sendActivity(): Promise<'ok' | 'ended' | 'unavailable'> {
  lastPingAt = Date.now();
  return api
    .post('/vrms/session/activity', {}, { withCredentials: true, sessionCall: true, quiet: true })
    .then(() => 'ok' as const)
    .catch((error: AxiosError) => (error.response?.status === 401 ? ('ended' as const) : ('unavailable' as const)));
}

async function pingNow() {
  pingTimer = null;
  if (leaving || !useAuthStore.getState().token) return;
  if ((await sendActivity()) === 'ended') leave(loginUrl(), ENDED_MESSAGE);
}

/**
 * Real input: a ping now if the last one is a minute old, else one trailing ping when the minute
 * is up. Paused while the idle warning is open, so only **Stay signed in** keeps the session.
 */
function onInput(event: Event) {
  if (!event.isTrusted || leaving || pingTimer) return;
  const { token, idleWarning } = useAuthStore.getState();
  if (!token || idleWarning) return;
  const delay = activityDelayMs(lastPingAt, Date.now());
  if (delay === 0) void pingNow();
  else pingTimer = setTimeout(() => void pingNow(), delay);
}

function listenForInput() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  for (const name of INPUT_EVENTS) {
    window.addEventListener(name, onInput, { capture: true, passive: true });
  }
}

// ---------------------------------------------------------------------------------------------
// Boot and logout

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
    listenForInput();
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
 * Logout (AC-24): ends the session on the server for every system, with the access token as well
 * as the cookie, then opens the portal's form. Every other VRMS tab leaves at once. Answers
 * `failed` when the server couldn't be reached, so the caller can offer to try again.
 */
export async function signOut(): Promise<'ok' | 'failed'> {
  if (leaving) return 'ok';
  try {
    await api.post('/vrms/session/logout', {}, withToken());
  } catch {
    return 'failed';
  }
  channel?.postMessage({ type: 'logout' } satisfies ChannelMessage);
  leave(loginUrl('logout'));
  return 'ok';
}

channel?.addEventListener('message', (event: MessageEvent<ChannelMessage>) => {
  if (leaving) return;
  const message = event.data;
  // Another tab refreshed: take its token (AC-21)
  if (message?.type === 'token') apply(message);
  // Another tab logged out: the session is gone here too (AC-24)
  else if (message?.type === 'logout') leave(loginUrl('logout'));
  // Another tab chose Stay signed in: check the new cutoff now
  else if (message?.type === 'extended' && useAuthStore.getState().idleWarning) {
    if (idleTimer) clearTimeout(idleTimer);
    void checkIdle();
  }
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
      if (outcome === 'unavailable') {
        // AC-25: keep working on what is cached and keep trying in the background
        if (!useAuthStore.getState().reconnecting) reconnect();
        return Promise.reject(error);
      }
    }
    leave(loginUrl(), ENDED_MESSAGE);
    return Promise.reject(error);
  },
);
