import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// covers: spec 0010 AC-7 (no code in src/ falls back to a localhost address)

const SRC = __dirname;

/** Every app source file: tests and type declarations are not shipped code. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    const isCode = /\.(ts|tsx)$/.test(entry.name);
    const isTest = /\.(test|spec)\.(ts|tsx)$/.test(entry.name) || entry.name.endsWith('.d.ts');
    return isCode && !isTest ? [path] : [];
  });
}

/** Lines that name a local address in code, ignoring comment lines. */
function localAddressLines(file: string): string[] {
  return readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((line, index) => ({ text: line.trim(), number: index + 1 }))
    .filter(({ text }) => !/^(\/\/|\/\*|\*)/.test(text))
    .filter(({ text }) => /localhost|127\.0\.0\.1|\[::1\]/.test(text))
    .map(({ text, number }) => `${file.slice(SRC.length + 1)}:${number}: ${text}`);
}

describe('app code has no local address fallback (AC-7)', () => {
  it('finds source files to check', () => {
    expect(sourceFiles(SRC).length).toBeGreaterThan(20);
  });

  it('names no localhost, 127.0.0.1 or [::1] outside comments', () => {
    const found = sourceFiles(SRC).flatMap(localAddressLines);
    expect(found).toEqual([]);
  });
});
