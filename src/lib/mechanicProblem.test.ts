import { describe, expect, it } from 'vitest';
import { ticket } from '../test/ticketFixture';
import { hasNoMechanic, mechanicProblem, NO_MECHANIC_STATUSES } from './mechanicProblem';

// Spec 0011, AC-34 and spec 0019, AC-13: the staffing badge and the dashboard's "No mechanic".

describe('hasNoMechanic', () => {
  it.each(NO_MECHANIC_STATUSES)('flags %s with no mechanic', (status) => {
    expect(hasNoMechanic(ticket({ status, mechanicCount: 0 }))).toBe(true);
    expect(hasNoMechanic(ticket({ status, mechanicCount: 2 }))).toBe(false);
  });

  it('never flags Open, Assigned or a finished ticket, nor a row without the count', () => {
    for (const status of ['OPEN', 'ASSIGNED', 'CLOSED', 'CANCELLED'] as const) {
      expect(hasNoMechanic(ticket({ status, mechanicCount: 0 }))).toBe(false);
    }
    expect(hasNoMechanic(ticket({ status: 'IN_PROGRESS' }))).toBe(false);
  });
});

describe('mechanicProblem', () => {
  it('names an inactive mechanic first, then No mechanic, then Needs a mechanic', () => {
    expect(mechanicProblem(ticket({ status: 'IN_PROGRESS', mechanicCount: 0, hasInactiveMechanic: true }))).toBe('Inactive mechanic');
    expect(mechanicProblem(ticket({ status: 'IN_PROGRESS', mechanicCount: 0, needsMechanic: true }))).toBe('No mechanic');
    expect(mechanicProblem(ticket({ status: 'IN_PROGRESS', mechanicCount: 1, needsMechanic: true }))).toBe('Needs a mechanic');
    expect(mechanicProblem(ticket({ status: 'IN_PROGRESS', mechanicCount: 1 }))).toBeNull();
  });
});
