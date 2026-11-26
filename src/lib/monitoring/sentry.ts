import * as Sentry from '@sentry/react';
import type { UserRoleAssignment } from '../../types';
import { apiOrigin, beforeBreadcrumb, createBeforeSend, IGNORE_ERRORS, vrmsRoleTag } from './filters';
import { setCrashViewerIsAdmin } from './standing';

// VRMS spec 0025, Browser setup. With VITE_SENTRY_DSN blank nothing starts and nothing is sent
// (AC-14); every other call here is then a harmless no op.

const DSN = import.meta.env.VITE_SENTRY_DSN;

/** True when Sentry was started for this page load; the crash screen shows a code only then. */
export const monitoringOn = Boolean(DSN);

/** Called once from main.tsx, before createRoot. */
export function initMonitoring(): void {
  if (!DSN) return;
  const origin = apiOrigin(import.meta.env.VITE_API_BASE_URL);
  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || undefined,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    // AC-4: through our gateway, never a sentry.io host from the browser
    tunnel: import.meta.env.VITE_SENTRY_TUNNEL || undefined,
    initialScope: { tags: { system: 'vrms-web' } },
    // AC-6: collect nothing personal; beforeSend's allowlist is the second line of defence
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
    // No spans are sent; the integration is what adds sentry-trace and baggage to API calls (AC-9)
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0,
    tracePropagationTargets: origin ? [origin] : [],
    maxBreadcrumbs: 20,
    ignoreErrors: IGNORE_ERRORS,
    // Console breadcrumbs are dropped here; fetch and XHR keep method, path and status
    beforeBreadcrumb,
    beforeSend: createBeforeSend(),
  });
}

/** AC-1 and AC-3: the signed in caller as an id and their VRMS role names, nothing else. */
export function setMonitoringUser(user: { id: string; roles?: UserRoleAssignment[] } | null): void {
  // AC-7a: worked out again on every session answer and before the off switch, so a demotion or a
  // sign out turns the admin crash screen off, and admins get it with Sentry off too
  setCrashViewerIsAdmin(isVrmsAdmin(user?.roles));
  if (!monitoringOn) return;
  if (!user) {
    Sentry.setUser(null);
    Sentry.setTag('role', undefined);
    return;
  }
  Sentry.setUser({ id: user.id });
  Sentry.setTag('role', vrmsRoleTag(user.roles ?? []));
}

/** The session answer's own VRMS entry, never `user.role` (which falls back to MECHANIC). */
function isVrmsAdmin(roles: UserRoleAssignment[] | undefined): boolean {
  return (roles ?? []).some((entry) => entry.system === 'VRMS' && entry.role === 'ADMIN');
}

/** Reports a render crash once, with the component stack; the event id backs the reference code. */
export function reportRenderCrash(error: unknown, componentStack: string | null | undefined): string | undefined {
  if (!monitoringOn) return undefined;
  return Sentry.captureException(error, { contexts: { react: { componentStack: componentStack ?? '' } } });
}

/** createRoot's handlers for what no boundary caught (React 19). */
export const rootErrorHandlers = {
  onUncaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
  // The boundary already reported it
  onCaughtError: (error: unknown) => console.error(error),
};
