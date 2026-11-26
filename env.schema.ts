import { z } from 'zod';

/**
 * Every VITE_* variable welinc-web-vrms reads, checked by vite.config.ts before `vite` serves or
 * builds (spec 0010). VITE_* values ship to the browser: never put a secret here.
 */

// Empty or blank strings count as missing.
const blank = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const required = z.preprocess(blank, z.string({ error: 'is required' }).trim());
const httpUrl = z.url({ protocol: /^https?$/, error: 'must be an http or https URL' });
const url = required.pipe(httpUrl);
const optional = <T extends z.ZodType>(s: T) => z.preprocess(blank, s.optional());

export const envSchema = z.object({
  /** The gateway the browser calls (the API lives under /vrms/). */
  VITE_API_BASE_URL: url,
  /** The SSO portal: sign in, sign out and Switch system go there. */
  VITE_PORTAL_URL: url,

  // Error monitoring (VRMS spec 0025): all optional; a blank DSN means off (AC-14)
  /** The vrms-web project's DSN. Public by design: it can only send events. */
  VITE_SENTRY_DSN: optional(httpUrl),
  VITE_SENTRY_ENVIRONMENT: optional(z.enum(['staging', 'production'], { error: 'must be staging or production' })),
  /** The commit SHA, set by the deploy job. */
  VITE_SENTRY_RELEASE: optional(z.string().trim()),
  /** The gateway route browser reports go through (AC-4): <api>/monitoring/vrms-web. */
  VITE_SENTRY_TUNNEL: optional(httpUrl),
  /** true only in the staging build: the /debug/sentry test page (AC-16). */
  VITE_SENTRY_TEST_ROUTES: optional(z.enum(['true', 'false'], { error: 'must be true or false' })),

  /** true only in the staging build: the /dev/ui kit behind sign in. Development always has it. */
  VITE_DEV_UI: optional(z.enum(['true', 'false'], { error: 'must be true or false' })),
});

export type ClientEnv = z.infer<typeof envSchema>;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Production builds must call real https addresses, never the visitor's own computer (AC-4). */
function productionIssues(env: Record<string, string | undefined>): string[] {
  const lines: string[] = [];
  for (const name of Object.keys(envSchema.shape)) {
    const value = blank(env[name]);
    if (typeof value !== 'string' || !URL.canParse(value.trim())) continue;
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'https:') lines.push(`${name}: must use https in production`);
    else if (LOCAL_HOSTS.has(parsed.hostname)) {
      lines.push(`${name}: must not point at localhost in production`);
    }
  }
  return lines;
}

/**
 * Throws one Error listing every problem as `NAME: reason`, never a value (AC-7). `mode` is
 * Vite's mode: `production` for `vite build`, `development` for `vite` and `build:local`.
 */
export function checkEnv(env: Record<string, string | undefined>, mode: string): ClientEnv {
  const result = envSchema.safeParse(env);
  const lines = [
    ...(result.success ? [] : result.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`)),
    ...(mode === 'production' ? productionIssues(env) : []),
  ];
  if (lines.length) {
    throw new Error(
      `Environment check failed (mode ${mode}):\n  ${[...new Set(lines)].join('\n  ')}\n` +
        'Local builds use `npm run build:local`; see .env.example.',
    );
  }
  return result.data!;
}
