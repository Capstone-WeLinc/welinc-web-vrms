import { describe, expect, it } from 'vitest';
import { noAccessLine, noAccessNote, readNoAccess, rolePlural } from './noAccess';

// Suite spec 0016, AC-12
describe('the no access note', () => {
  it('reads as the spec example', () => {
    expect(noAccessLine(noAccessNote('Analytics', 'MECHANIC'))).toBe("That link was for Analytics, which Mechanics can't open.");
  });

  it('names an unknown role gently', () => {
    expect(rolePlural('SOMETHING_NEW')).toBe('People with your role');
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
