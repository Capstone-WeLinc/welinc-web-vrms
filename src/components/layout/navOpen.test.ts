import { describe, expect, it } from 'vitest';
import { navOpenKey, parseNavOpen, toggled } from './navOpen';

// covers: spec 0027 AC-3
describe('nav open state', () => {
  it('is kept per user', () => {
    expect(navOpenKey('u1')).toBe('welinc:nav-open:u1');
  });

  it('reads a JSON list of paths, and anything else as none', () => {
    expect(parseNavOpen('["/repairs"]')).toEqual(['/repairs']);
    expect(parseNavOpen('["/repairs", 3, null]')).toEqual(['/repairs']);
    expect(parseNavOpen('{"a":1}')).toEqual([]);
    expect(parseNavOpen('not json')).toEqual([]);
    expect(parseNavOpen(null)).toEqual([]);
  });

  it('opens and closes one parent', () => {
    expect(toggled(['/repairs'], '/knowledge-base', true)).toEqual(['/repairs', '/knowledge-base']);
    expect(toggled(['/repairs', '/knowledge-base'], '/repairs', false)).toEqual(['/knowledge-base']);
    expect(toggled(['/repairs'], '/repairs', true)).toEqual(['/repairs']);
  });
});
