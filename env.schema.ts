import { z } from 'zod';

/**
 * Every VITE_* variable welinc-web-vrms reads, checked by vite.config.ts before `vite` serves or
 * builds (spec 0010). VITE_* values ship to the browser: never put a secret here.
 */

// Empty or blank strings count as missing.
const blank = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const required = z.preprocess(blank, z.string({ error: 'is required' }).trim());
const url = required.pipe(z.url({ protocol: /^https?$/, error: 'must be an http or https URL' }));

export const envSchema = z.object({
  /** The gateway the browser calls (the API lives under /vrms/). */
  VITE_API_BASE_URL: url,
  /** The SSO portal: sign in, sign out and Switch system go there. */
  VITE_PORTAL_URL: url,
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
