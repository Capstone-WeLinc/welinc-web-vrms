import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// covers: VRMS spec 0028 AC-17 (the motion rules in the scene kit's CSS)
// Plain Node: reads the CSS as text. How the motion looks and whether the still frame tells its story are /check verify.

const css = readFileSync(new URL('./scenes.css', import.meta.url), 'utf8');

/** Each `@utility scene-x { ... }` block, found by matching braces (the blocks nest `@media`). */
function utilityBlocks(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  const start = /@utility (scene-[a-z0-9-]+) \{/g;
  for (let m = start.exec(source); m; m = start.exec(source)) {
    let depth = 1;
    let i = start.lastIndex;
    while (depth > 0 && i < source.length) {
      if (source[i] === '{') depth++;
      if (source[i] === '}') depth--;
      i++;
    }
    out[m[1]] = source.slice(start.lastIndex, i - 1);
  }
  return out;
}

/** Each `@keyframes scene-x { ... }` body. */
function keyframeBodies(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  const start = /@keyframes (scene-[a-z0-9-]+) \{/g;
  for (let m = start.exec(source); m; m = start.exec(source)) {
    let depth = 1;
    let i = start.lastIndex;
    while (depth > 0 && i < source.length) {
      if (source[i] === '{') depth++;
      if (source[i] === '}') depth--;
      i++;
    }
    out[m[1]] = source.slice(start.lastIndex, i - 1);
  }
  return out;
}

const utilities = utilityBlocks(css);
const keyframes = keyframeBodies(css);
const animated = Object.entries(utilities).filter(([, body]) => /animation: scene-/.test(body));

describe('scene kit motion (AC-17)', () => {
  it('finds the motion utilities and their keyframes', () => {
    expect(animated.length).toBeGreaterThan(5);
    expect(Object.keys(keyframes).length).toBeGreaterThan(5);
  });

  it.each(animated)('%s loops and never plays once', (_name, body) => {
    const declaration = body.match(/animation: (scene-[^;]+);/);
    expect(declaration?.[1]).toMatch(/ infinite$/);
  });

  it.each(animated)('%s stops under reduced motion and inside data-motion still', (_name, body) => {
    expect(body).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*animation: none;\s*\}/);
    expect(body).toMatch(/\[data-motion='still'\] & \{\s*animation: none;\s*\}/);
  });

  it.each(animated)('%s names a keyframes block that exists', (_name, body) => {
    const name = body.match(/animation: (scene-[a-z0-9-]+)/)?.[1] ?? '';
    expect(keyframes[name]).toBeDefined();
  });

  it('animates only opacity and transform, plus the colour pulses (fill and stroke-opacity)', () => {
    const allowed = new Set(['opacity', 'transform', 'fill', 'stroke-opacity']);
    for (const [name, body] of Object.entries(keyframes)) {
      const properties = [...body.matchAll(/^\s*([a-z-]+):/gm)].map((m) => m[1]);
      const stray = properties.filter((p) => !allowed.has(p));
      expect(stray, `${name} animates ${stray.join(', ')}`).toEqual([]);
    }
  });

  it('defines every scene motion class the scene components use', () => {
    const dir = new URL('../components/brand/scenes/', import.meta.url);
    const used = new Set<string>();
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.tsx'))) {
      const source = readFileSync(new URL(file, dir), 'utf8');
      for (const m of source.matchAll(/className="([^"]*)"/g)) {
        for (const token of m[1].split(/\s+/)) if (token.startsWith('scene-')) used.add(token);
      }
    }
    expect(used.size).toBeGreaterThan(5);
    const missing = [...used].filter((c) => !utilities[c] && !new RegExp(`\\.${c}\\b`).test(css));
    expect(missing).toEqual([]);
  });
});
