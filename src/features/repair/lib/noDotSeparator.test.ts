import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Spec 0024, AC-19: no dot separator anywhere on the ticket page, its dialogs or the photo viewer.
// The new repair form keeps its own rules, so it is left out.
const DOT = '\u00b7';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SKIP = [/^components\/repair-form\//, /^pages\/RepairFormPage\.tsx$/];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('ticket page wording (spec 0024, AC-19)', () => {
  it('has no dot separator in the ticket page code', () => {
    const offenders = sourceFiles(ROOT)
      .map((path) => relative(ROOT, path).split('\\').join('/'))
      .filter((path) => !SKIP.some((skip) => skip.test(path)))
      .flatMap((path) =>
        readFileSync(join(ROOT, path), 'utf8')
          .split('\n')
          .flatMap((line, n) => (line.includes(DOT) ? [`${path}:${n + 1}`] : [])),
      );
    expect(offenders).toEqual([]);
  });
});
