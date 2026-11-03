import { describe, expect, it } from 'vitest';
import type { MechanicOption } from '../../../lib/api/vrmsConfigApi';
import { mechanicDescription, sortMechanics } from './mechanicOrder';

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

// The pickers' second line: open count, plus the email so two people with one name stay apart.
describe('mechanicDescription', () => {
  it('adds the email after the open count', () => {
    expect(mechanicDescription({ openCount: 2, email: 'juan@example.com' })).toBe('2 open · juan@example.com');
  });

  it('shows only the count for a row with no login email', () => {
    expect(mechanicDescription({ openCount: 0, email: null })).toBe('0 open');
    expect(mechanicDescription({ openCount: 1 })).toBe('1 open');
  });

  it('tells two mechanics with the same name apart', () => {
    const a = mechanicDescription({ openCount: 1, email: 'juan.a@example.com' });
    const b = mechanicDescription({ openCount: 1, email: 'juan.b@example.com' });
    expect(a).not.toBe(b);
  });
});
