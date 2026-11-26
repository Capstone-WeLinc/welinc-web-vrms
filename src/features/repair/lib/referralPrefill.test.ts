import { describe, expect, it } from 'vitest';
import type { ReferralDetail } from '../../../lib/api/referralsApi';
import { findingDescription, referralBlocker, referralFormValues } from './referralPrefill';
import { buildRepairFormSchema, REPAIR_FORM_DEFAULTS, toCreatePayload, type RepairFormValues } from './repairFormSchema';

// covers: spec 0029 AC-8 (the new ticket form from a VMMS referral)

const referral = (over: Partial<ReferralDetail> = {}): ReferralDetail => ({
  id: '6e1c2f40-0029-4a2b-9c1d-5f0e2a7b3c91',
  status: 'WAITING',
  receivedAt: '2026-11-27T01:00:00.000Z',
  workOrderNumber: 'WO-20261116-000026',
  odometerReading: 72000,
  findings: [
    { checklistItemId: 'brakes-front', label: 'Front brake pads', note: 'Worn to 2 mm' },
    { checklistItemId: '', label: 'Air dryer', note: null },
  ],
  chiefMechanicRemarks: 'Do not dispatch until brakes are done',
  rejectionReason: null,
  decidedByName: null,
  decidedAt: null,
  repairTicket: null,
  vehicle: {
    id: 'v1',
    plateNumber: 'CAK 9043',
    model: 'Elf',
    isActive: true,
    garage: { id: 'g1', name: 'Sta. Rosa' },
    openTicket: null,
  },
  ...over,
});

describe('referralFormValues', () => {
  it('fills the truck, its garage, the odometer and one issue per finding, leaving system and root cause', () => {
    const values = referralFormValues(referral());
    expect(values).toMatchObject({
      vehiclePlate: 'CAK 9043',
      garageLocation: 'Sta. Rosa',
      odometerReading: '72000',
      driverId: '',
      addingDriver: false,
    });
    expect(values.issues).toEqual([
      { knowledgeEntryId: '', categoryId: '', rootCause: '', description: 'Front brake pads: Worn to 2 mm' },
      { knowledgeEntryId: '', categoryId: '', rootCause: '', description: 'Air dryer' },
    ]);
  });

  it('leaves the garage empty when the truck has none', () => {
    const noGarage = referral({ vehicle: { ...referral().vehicle, garage: null } });
    expect(referralFormValues(noGarage).garageLocation).toBe('');
  });

  it('cuts a long finding to the 500 character description limit', () => {
    expect(findingDescription({ checklistItemId: 'x', label: 'L', note: 'n'.repeat(900) })).toHaveLength(500);
  });
});

describe('referralBlocker', () => {
  it('allows a waiting referral on an active truck with no open ticket', () => {
    expect(referralBlocker(referral())).toBeNull();
  });

  it('names the reason it can’t open a ticket', () => {
    expect(referralBlocker(referral({ status: 'REJECTED' }))).toBe('This referral was already handled.');
    expect(
      referralBlocker(
        referral({
          vehicle: { ...referral().vehicle, openTicket: { id: 't1', repairNumber: 'REP-1', repairStatus: 'OPEN' } },
        }),
      ),
    ).toContain('REP-1');
    expect(referralBlocker(referral({ vehicle: { ...referral().vehicle, isActive: false } }))).toBe(
      'This truck was removed in VMMS.',
    );
  });
});

describe('the form schema with a referral', () => {
  const lists = { vehiclePlates: null, garageNames: null, mechanicIds: null, corporationIds: null };
  const filled = {
    ...REPAIR_FORM_DEFAULTS,
    vehiclePlate: 'CAK 9043',
    garageLocation: 'Sta. Rosa',
    odometerReading: '72000',
    issues: [{ knowledgeEntryId: '', categoryId: 'c1', rootCause: 'WEAR_AND_TEAR', description: 'Pads' }],
  };

  it('needs no driver for a referral, and still needs one otherwise', () => {
    expect(buildRepairFormSchema({ ...lists, driverOptional: true }).safeParse(filled).success).toBe(true);
    const plain = buildRepairFormSchema(lists).safeParse(filled);
    expect(plain.success).toBe(false);
    expect(plain.error?.issues.map((i) => i.path.join('.'))).toContain('driverId');
  });

  it('sends the referral id and no empty driver id', () => {
    const values = buildRepairFormSchema({ ...lists, driverOptional: true }).parse(filled) as RepairFormValues;
    const payload = toCreatePayload(values, { referralId: 'r1' });
    expect(payload.referralId).toBe('r1');
    expect(payload).not.toHaveProperty('driverId');
    expect(payload).not.toHaveProperty('newDriver');
  });
});
