import type { Breadcrumb, ErrorEvent, EventHint } from '@sentry/react';
import { redact } from './redact';

// VRMS spec 0025: which browser errors reach Sentry and what they may carry (AC-6, AC-9).

/** Noise the browser raises on its own: no network, a cancelled call, layout loops (AC-9). */
export const IGNORE_ERRORS: (string | RegExp)[] = [
  /^TypeError: Failed to fetch/,
  'Failed to fetch',
  'NetworkError',
  'Network Error',
  'Load failed',
  'AbortError',
  'ResizeObserver loop',
];

/** At most this many events leave one page load, so a crash loop can't use up the quota. */
export const EVENTS_PER_PAGE = 10;

/**
 * An error the API client raised: an answer with a status, a network failure or a cancelled call.
 * The server reports its own failures, so the browser never does (AC-9).
 */
export function isApiClientError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { isAxiosError?: unknown; name?: unknown; response?: { status?: unknown } };
  return (
    candidate.isAxiosError === true ||
    candidate.name === 'CanceledError' ||
    candidate.name === 'AbortError' ||
    typeof candidate.response?.status === 'number'
  );
}

/** A URL with its query string and fragment removed, redacted. */
export function stripQuery(url: string): string {
  return redact(url.split(/[?#]/)[0]);
}

/** Fetch and XHR breadcrumbs keep only method, path and status; console ones never get here. */
export function beforeBreadcrumb(crumb: Breadcrumb): Breadcrumb | null {
  if (crumb.category === 'console') return null;
  if (crumb.category === 'fetch' || crumb.category === 'xhr') {
    const data = crumb.data ?? {};
    return {
      ...crumb,
      data: {
        method: data.method as unknown,
        url: typeof data.url === 'string' ? stripQuery(data.url) : undefined,
        status_code: data.status_code as unknown,
      },
    };
  }
  if (crumb.category === 'navigation') {
    const data = crumb.data ?? {};
    return {
      ...crumb,
      data: {
        from: typeof data.from === 'string' ? stripQuery(data.from) : undefined,
        to: typeof data.to === 'string' ? stripQuery(data.to) : undefined,
      },
    };
  }
  return crumb.message ? { ...crumb, message: redact(crumb.message) } : crumb;
}

/**
 * Builds the beforeSend hook with its own per page counter: drops API client errors, strips the
 * query from the request, keeps only the user id, redacts every text, and stops after the cap.
 */
export function createBeforeSend(cap = EVENTS_PER_PAGE) {
  let sent = 0;
  return (event: ErrorEvent, hint: EventHint): ErrorEvent | null => {
    if (isApiClientError(hint.originalException)) return null;
    if (sent >= cap) return null;

    if (event.request) {
      const userAgent = event.request.headers?.['User-Agent'] ?? event.request.headers?.['user-agent'];
      event.request = {
        url: event.request.url ? stripQuery(event.request.url) : undefined,
        headers: userAgent ? { 'User-Agent': userAgent } : {},
      };
    }
    event.user = event.user?.id ? { id: event.user.id } : undefined;
    if (event.message) event.message = redact(event.message);
    for (const exception of event.exception?.values ?? []) {
      if (exception.value) exception.value = redact(exception.value);
    }
    for (const crumb of event.breadcrumbs ?? []) {
      if (crumb.message) crumb.message = redact(crumb.message);
    }
    sent += 1;
    return event;
  };
}

/** The API origin from VITE_API_BASE_URL: the only place sentry-trace and baggage go (AC-9). */
export function apiOrigin(baseUrl: string): string | undefined {
  return URL.canParse(baseUrl) ? new URL(baseUrl).origin : undefined;
}

/** The `role` tag: the caller's VRMS role names from the session answer, never `user.role`. */
export function vrmsRoleTag(roles: { role: string; system: string }[]): string | undefined {
  const names = roles.filter((entry) => entry.system === 'VRMS').map((entry) => entry.role);
  return names.length ? names.join(',') : undefined;
}
