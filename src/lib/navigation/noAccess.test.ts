import { describe, expect, it } from 'vitest';
import { noAccessLine, noAccessNote, readNoAccess, rolePlural } from './noAccess';

// Suite spec 0016, AC-12
describe('the no access note', () => {
  it('reads as the spec example', () => {
    expect(noAccessLine(noAccessNote('Analytics', 'MECHANIC'))).toBe("That link was for Analytics, which Mechanics can't open.");
  });

  // covers: suite spec 0018 child 0002 AC-35 (names from the catalog, title case until it loads)
  it('names a role from its catalog name, a custom one too, and no role gently', () => {
    expect(rolePlural('C_TIRE_SPECIALIST')).toBe('Tire specialists');
    expect(rolePlural('C_NIGHT_SHIFT_LEAD')).toBe('Night shift leads');
    expect(rolePlural(undefined)).toBe('People with your role');
  });

  it('reads router state of any shape', () => {
    const note = noAccessNote('Users', 'CHIEF_MECHANIC');
    expect(readNoAccess({ noAccess: note })).toEqual(note);
    expect(readNoAccess(null)).toBeNull();
    expect(readNoAccess({ from: '/x' })).toBeNull();
    expect(readNoAccess({ noAccess: { page: 1 } })).toBeNull();
  });
});
