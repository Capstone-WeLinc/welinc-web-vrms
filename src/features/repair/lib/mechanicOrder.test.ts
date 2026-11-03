import { describe, expect, it } from 'vitest';
import type { MechanicOption } from '../../../lib/api/vrmsConfigApi';
import { mechanicDescription, nameKey, sharedNames, sortMechanics } from './mechanicOrder';

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

// The pickers' second text: the open count, with the email inline only for a shared name.
describe('nameKey', () => {
  it('ignores case, outer spaces and repeated spaces', () => {
    expect(nameKey('  Juan   dela Cruz ')).toBe('juan dela cruz');
    expect(nameKey('JUAN DELA CRUZ')).toBe(nameKey('Juan dela Cruz'));
  });
});

describe('sharedNames', () => {
  const named = (name: string) => ({ name });

  it('finds a name two mechanics have, however it is spaced or cased', () => {
    const shared = sharedNames([named('Juan dela Cruz'), named('Ana'), named(' juan  DELA cruz ')]);
    expect(shared.has(nameKey('Juan dela Cruz'))).toBe(true);
    expect(shared.has(nameKey('Ana'))).toBe(false);
  });

  it('is empty when every name is different, or the list is empty', () => {
    expect(sharedNames([named('Ana'), named('Ben')]).size).toBe(0);
    expect(sharedNames([]).size).toBe(0);
  });
});

describe('mechanicDescription', () => {
  const none = new Set<string>();
  const shared = sharedNames([{ name: 'Juan dela Cruz' }, { name: 'Juan dela Cruz' }]);

  it('is only the open count for a name nobody else has', () => {
    expect(mechanicDescription({ name: 'Ana', openCount: 2, email: 'ana@example.com' }, none)).toBe('2 open');
  });

  it('adds the email when another mechanic has the same name, so the two tell apart', () => {
    const a = mechanicDescription({ name: 'Juan dela Cruz', openCount: 1, email: 'juan.a@example.com' }, shared);
    const b = mechanicDescription({ name: 'Juan dela Cruz', openCount: 1, email: 'juan.b@example.com' }, shared);
    expect(a).toBe('1 open, juan.a@example.com');
    expect(a).not.toBe(b);
  });

  it('shows only the count for a shared name with no email on file', () => {
    expect(mechanicDescription({ name: 'Juan dela Cruz', openCount: 3, email: null }, shared)).toBe('3 open');
    expect(mechanicDescription({ name: 'Juan dela Cruz', openCount: 0 }, shared)).toBe('0 open');
  });
});
