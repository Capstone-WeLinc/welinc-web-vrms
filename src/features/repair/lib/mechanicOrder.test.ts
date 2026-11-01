import { describe, expect, it } from 'vitest';
import type { MechanicOption } from '../../../lib/api/vrmsConfigApi';
import { sortMechanics } from './mechanicOrder';

const m = (name: string, openCount: number, busy = false): MechanicOption => ({
  id: name,
  name,
  isAvailable: openCount === 0,
  openCount,
  busy,
});

describe('sortMechanics', () => {
  it('puts the fewest open tickets first, then by name', () => {
    const out = sortMechanics([m('Zed', 0), m('Ben', 2, true), m('Ana', 2), m('Cy', 0)]);
    expect(out.map((x) => x.name)).toEqual(['Cy', 'Zed', 'Ana', 'Ben']);
  });

  it('does not change the list it is given', () => {
    const input = [m('B', 1), m('A', 0)];
    sortMechanics(input);
    expect(input[0].name).toBe('B');
  });
});
