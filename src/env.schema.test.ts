import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkEnv, envSchema } from '../env.schema';

// covers: spec 0010 AC-4, AC-7, AC-10

const errorOf = (env: Record<string, string | undefined>, mode: string): string => {
  try {
    checkEnv(env, mode);
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error('expected the environment check to fail');
};

const LOCAL = {
  VITE_API_BASE_URL: 'http://localhost:3000',
  VITE_PORTAL_URL: 'http://localhost:8000',
};
const HOSTED = {
  VITE_API_BASE_URL: 'https://api.welinc.test',
  VITE_PORTAL_URL: 'https://portal.welinc.test',
};

describe('checkEnv', () => {
  it('passes the local addresses in development and real ones in production', () => {
    expect(checkEnv(LOCAL, 'development')).toEqual(LOCAL);
    expect(checkEnv(HOSTED, 'production')).toEqual(HOSTED);
  });

  it('lists every missing or blank name at once (AC-7)', () => {
    const message = errorOf({ VITE_API_BASE_URL: '  ' }, 'development');
    expect(message).toContain('VITE_API_BASE_URL: is required');
    expect(message).toContain('VITE_PORTAL_URL: is required');
  });

  it('refuses a malformed address (AC-7)', () => {
    expect(errorOf({ ...LOCAL, VITE_PORTAL_URL: 'portal' }, 'development')).toContain(
      'VITE_PORTAL_URL: must be an http or https URL',
    );
  });

  it('refuses http and localhost only in production (AC-4)', () => {
    const message = errorOf(
      { VITE_API_BASE_URL: 'https://localhost:3000', VITE_PORTAL_URL: 'http://portal.welinc.test' },
      'production',
    );
    expect(message).toContain('VITE_API_BASE_URL: must not point at localhost in production');
    expect(message).toContain('VITE_PORTAL_URL: must use https in production');
    expect(errorOf(LOCAL, 'production')).toContain('must use https in production');
  });

  it('never puts a value in the message', () => {
    const message = errorOf({ VITE_API_BASE_URL: 'SENTINEL-77', VITE_PORTAL_URL: 'http://SENTINEL-77.test' }, 'production');
    expect(message).not.toContain('SENTINEL-77');
  });
});

describe('the env files and the schema stay in step (AC-10)', () => {
  /** Lines like `NAME=` or `# NAME=`: commented names count as documented. */
  const namesIn = (file: string) =>
    readFileSync(join(__dirname, '..', file), 'utf8')
      .split(/\r?\n/)
      .map((line) => /^#?\s*([A-Z][A-Z0-9_]*)=/.exec(line)?.[1])
      .filter((name): name is string => Boolean(name))
      .sort();
  const schemaNames = Object.keys(envSchema.shape).sort();

  it('.env.example names exactly the schema', () => {
    expect(namesIn('.env.example')).toEqual(schemaNames);
  });

  it('.env.development names exactly the schema', () => {
    expect(namesIn('.env.development')).toEqual(schemaNames);
  });
});
