import { describe, expect, it } from 'vitest';
import { readRepairView, viewAllowed } from './repairViews';
import { DEFAULT_REPAIR_LIST_FILTERS, readListState, withFilterPatch, writeListState } from './repairListFilters';

// covers: spec 0027 AC-2, AC-4
describe('repair list view presets', () => {
  it('reads the presets and leaves the referrals tab out', () => {
    expect(readRepairView('signoff')).toBe('signoff');
    expect(readRepairView('referrals')).toBeNull();
    expect(readRepairView('bogus')).toBeNull();
  });

  it('offers each preset to the viewers whose sidebar shows it', () => {
    const chief = { seesAll: true, inRoster: true };
    const admin = { seesAll: true, inRoster: false };
    const mechanic = { seesAll: false, inRoster: true };

    expect(viewAllowed('signoff', chief)).toBe(true);
    expect(viewAllowed('mine', chief)).toBe(true);
    expect(viewAllowed('mine', admin)).toBe(false);
    expect(viewAllowed('sentBack', mechanic)).toBe(true);
    expect(viewAllowed('open', mechanic)).toBe(false);
  });

  it('keeps view in the address with the other filters', () => {
    const params = writeListState({ ...DEFAULT_REPAIR_LIST_FILTERS, view: 'signoff', garageId: '0b9c3d2e-1f4a-4b5c-8d6e-7f8091a2b3c4' }, 2);

    expect(params.get('view')).toBe('signoff');
    expect(readListState(params, true)).toMatchObject({ filters: { view: 'signoff' }, page: 2 });
  });

  it('clears the preset when another status is picked, and keeps it for other filters', () => {
    const signoff = { ...DEFAULT_REPAIR_LIST_FILTERS, view: 'signoff' as const };

    expect(withFilterPatch(signoff, { status: 'ASSIGNED' }).view).toBeNull();
    expect(withFilterPatch(signoff, { overdue: true }).view).toBe('signoff');
    expect(withFilterPatch(signoff, { status: 'all' }).view).toBe('signoff');
  });
});
