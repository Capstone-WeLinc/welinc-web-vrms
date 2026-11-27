import { afterEach, describe, expect, it } from 'vitest';
import { roleLabel, rolePluralLabel, setRoleNamesForTest, titleCase } from './roles';

// covers: suite spec 0018 child 0002 AC-35
describe('role names', () => {
  afterEach(() => setRoleNamesForTest(null));

  it('reads a code in title case until the catalog answers, custom codes without their prefix', () => {
    expect(titleCase('CHIEF_MECHANIC')).toBe('Chief mechanic');
    expect(titleCase('C_TIRE_SPECIALIST')).toBe('Tire specialist');
    expect(roleLabel('MECHANIC')).toBe('Mechanic');
  });

  it('uses the catalog name once loaded, so a renamed custom role shows its new name', () => {
    setRoleNamesForTest({ CHIEF_MECHANIC: 'Chief Mechanic', C_TIRES_2: 'Tire and wheel specialist' });
    expect(roleLabel('CHIEF_MECHANIC')).toBe('Chief Mechanic');
    expect(roleLabel('C_TIRES_2')).toBe('Tire and wheel specialist');
    expect(rolePluralLabel('C_TIRES_2')).toBe('Tire and wheel specialists');
  });
});
