import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// covers: VRMS spec 0025 AC-1, AC-3, AC-4, AC-6, AC-14

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  setUser: vi.fn(),
  setTag: vi.fn(),
  captureException: vi.fn(() => 'abcdef0123456789abcdef0123456789'),
  browserTracingIntegration: vi.fn(() => ({ name: 'tracing' })),
  reactErrorHandler: vi.fn(() => vi.fn()),
}));

vi.mock('@sentry/react', () => sentry);

/** The module reads its DSN once at load, so each test loads a fresh copy under its own env. */
async function load(env: Record<string, string> = {}) {
  vi.resetModules();
  vi.stubEnv('VITE_SENTRY_DSN', env.dsn ?? '');
  vi.stubEnv('VITE_SENTRY_ENVIRONMENT', env.environment ?? '');
  vi.stubEnv('VITE_SENTRY_RELEASE', env.release ?? '');
  vi.stubEnv('VITE_SENTRY_TUNNEL', env.tunnel ?? '');
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3000');
  return import('./sentry');
}

const DSN = 'https://publickey@o1.ingest.us.sentry.io/2';

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllEnvs());

describe('with the DSN blank', () => {
  it('is off, starts nothing and sends nothing', async () => {
    const monitoring = await load();

    expect(monitoring.monitoringOn).toBe(false);
    monitoring.initMonitoring();
    monitoring.setMonitoringUser({ id: 'u1' });
    expect(sentry.init).not.toHaveBeenCalled();
    expect(sentry.setUser).not.toHaveBeenCalled();
    expect(sentry.setTag).not.toHaveBeenCalled();
  });

  it('gives a render crash no reference code', async () => {
    const monitoring = await load();

    expect(monitoring.reportRenderCrash(new Error('boom'), 'at Page')).toBeUndefined();
    expect(sentry.captureException).not.toHaveBeenCalled();
  });
});

describe('with a DSN', () => {
  it('starts Sentry once with the app settings from the environment', async () => {
    const monitoring = await load({
      dsn: DSN,
      environment: 'staging',
      release: 'abc1234',
      tunnel: 'https://staging-api.welinc.app/monitoring/vrms-web',
    });

    monitoring.initMonitoring();

    expect(sentry.init).toHaveBeenCalledTimes(1);
    expect(sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: DSN,
        environment: 'staging',
        release: 'abc1234',
        tunnel: 'https://staging-api.welinc.app/monitoring/vrms-web',
        initialScope: { tags: { system: 'vrms-web' } },
        tracesSampleRate: 0,
        tracePropagationTargets: ['http://localhost:3000'],
      }),
    );
  });

  it('collects nothing personal by default', async () => {
    const monitoring = await load({ dsn: DSN });

    monitoring.initMonitoring();

    const options = sentry.init.mock.calls[0]?.[0];
    expect(options.dataCollection).toEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    });
  });

  it('leaves environment, release and tunnel unset when they are blank', async () => {
    const monitoring = await load({ dsn: DSN });

    monitoring.initMonitoring();

    const options = sentry.init.mock.calls[0]?.[0];
    expect(options.environment).toBeUndefined();
    expect(options.release).toBeUndefined();
    expect(options.tunnel).toBeUndefined();
  });

  it('sets the user as an id and the VRMS role names only', async () => {
    const monitoring = await load({ dsn: DSN });

    monitoring.setMonitoringUser({
      id: 'u1',
      roles: [
        { role: 'CHIEF_MECHANIC', system: 'VRMS' },
        { role: 'OPERATIONS', system: 'VMMS' },
      ] as never,
    });

    expect(sentry.setUser).toHaveBeenCalledWith({ id: 'u1' });
    expect(sentry.setTag).toHaveBeenCalledWith('role', 'CHIEF_MECHANIC');
  });

  it('sets no role tag for a person with no VRMS role entry', async () => {
    const monitoring = await load({ dsn: DSN });

    monitoring.setMonitoringUser({ id: 'u1' });

    expect(sentry.setTag).toHaveBeenCalledWith('role', undefined);
  });

  it('clears the user and the role on sign out', async () => {
    const monitoring = await load({ dsn: DSN });

    monitoring.setMonitoringUser(null);

    expect(sentry.setUser).toHaveBeenCalledWith(null);
    expect(sentry.setTag).toHaveBeenCalledWith('role', undefined);
  });

  it('reports a render crash with its component stack and returns the event id', async () => {
    const monitoring = await load({ dsn: DSN });
    const error = new Error('boom');

    const eventId = monitoring.reportRenderCrash(error, '\n    at RepairPage');

    expect(eventId).toBe('abcdef0123456789abcdef0123456789');
    expect(sentry.captureException).toHaveBeenCalledWith(error, {
      contexts: { react: { componentStack: '\n    at RepairPage' } },
    });
  });

  it('sends an empty component stack when React gives none', async () => {
    const monitoring = await load({ dsn: DSN });

    monitoring.reportRenderCrash(new Error('boom'), null);

    expect(sentry.captureException).toHaveBeenCalledWith(expect.any(Error), {
      contexts: { react: { componentStack: '' } },
    });
  });

  it('does not report a second time for a boundary caught error', async () => {
    const monitoring = await load({ dsn: DSN });
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    monitoring.rootErrorHandlers.onCaughtError(new Error('boom'));

    expect(sentry.captureException).not.toHaveBeenCalled();
    log.mockRestore();
  });
});

describe('the crash screen standing (AC-7a)', () => {
  const admin = { id: 'u1', roles: [{ role: 'ADMIN' as const, system: 'VRMS' as const }] };
  const mechanic = { id: 'u1', roles: [{ role: 'MECHANIC' as const, system: 'VRMS' as const }] };

  it('follows each session answer: admin, then not admin after a demotion', async () => {
    const monitoring = await load({ dsn: DSN });
    const standing = await import('./standing');

    monitoring.setMonitoringUser(admin);
    expect(standing.crashViewerIsAdmin()).toBe(true);
    monitoring.setMonitoringUser(mechanic);
    expect(standing.crashViewerIsAdmin()).toBe(false);
  });

  it('is set with Sentry off too, and cleared by a sign out', async () => {
    const monitoring = await load();
    const standing = await import('./standing');

    monitoring.setMonitoringUser(admin);
    expect(standing.crashViewerIsAdmin()).toBe(true);
    expect(sentry.setUser).not.toHaveBeenCalled();
    monitoring.setMonitoringUser(null);
    expect(standing.crashViewerIsAdmin()).toBe(false);
  });

  it('counts only the VRMS ADMIN entry, not an admin role in another system', async () => {
    const monitoring = await load();
    const standing = await import('./standing');

    monitoring.setMonitoringUser({ id: 'u1', roles: [{ role: 'ADMIN', system: 'VMMS' as const }] });
    expect(standing.crashViewerIsAdmin()).toBe(false);
    monitoring.setMonitoringUser({ id: 'u1' });
    expect(standing.crashViewerIsAdmin()).toBe(false);
  });
});
