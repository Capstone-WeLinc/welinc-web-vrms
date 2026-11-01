import { describe, expect, it } from 'vitest';
import {
  buildRepairFormSchema,
  OTHER_ISSUE,
  REPAIR_FORM_DEFAULTS,
  toCreatePayload,
  type RepairFormInput,
} from './repairFormSchema';

// Spec 0016: the driver choice, the corporation, the optional mechanics and the description fallback.

const LISTS = {
  vehiclePlates: ['ABC 123'],
  garageNames: ['Sta. Rosa'],
  mechanicIds: ['m1'],
  corporationIds: ['c1'],
};

function valid(overrides: Partial<RepairFormInput> = {}): RepairFormInput {
  return {
    ...REPAIR_FORM_DEFAULTS,
    vehiclePlate: 'ABC 123',
    driverId: 'd1',
    driverLabel: 'Ana',
    garageLocation: 'Sta. Rosa',
    odometerReading: '1000',
    issues: [{ knowledgeEntryId: '', categoryId: 'cat', rootCause: 'Unknown', description: 'Noise' }],
    ...overrides,
  };
}

function messages(input: RepairFormInput) {
  const result = buildRepairFormSchema(LISTS).safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
}

describe('repair form schema', () => {
  it('accepts a form with no mechanic (AC-15)', () => {
    expect(messages(valid({ mechanics: [] }))).toEqual([]);
  });

  describe('driver (AC-6, AC-13)', () => {
    it('needs a picked driver or a new one', () => {
      expect(messages(valid({ driverId: '' }))).toContain('driverId: Choose or add a driver.');
    });

    it('checks a new driver’s name and license format', () => {
      const adding = valid({ addingDriver: true, driverId: '', newDriverName: '', newDriverLicense: 'bad' });
      expect(messages(adding)).toEqual(
        expect.arrayContaining([
          'newDriverName: Enter the driver’s name.',
          'newDriverLicense: Use the format A01-23-456789.',
        ]),
      );
    });

    it('accepts a lowercase license, which the payload uppercases', () => {
      const adding = valid({ addingDriver: true, driverId: '', newDriverName: ' Juan ', newDriverLicense: 'n01-23-456789' });
      expect(messages(adding)).toEqual([]);
      const result = buildRepairFormSchema(LISTS).parse(adding);
      expect(toCreatePayload(result)).toMatchObject({ newDriver: { name: 'Juan', licenseNumber: 'N01-23-456789' } });
      expect(toCreatePayload(result)).not.toHaveProperty('driverId');
    });

    it('sends driverId and no newDriver for a picked driver', () => {
      const payload = toCreatePayload(buildRepairFormSchema(LISTS).parse(valid()));
      expect(payload.driverId).toBe('d1');
      expect(payload).not.toHaveProperty('newDriver');
    });
  });

  describe('corporation (AC-4)', () => {
    it('is required for a corporate account and must still be in its list', () => {
      expect(messages(valid({ accountType: 'CORPORATE' }))).toContain('corporationId: Choose a corporation.');
      expect(messages(valid({ accountType: 'CORPORATE', corporationId: 'gone' }))).toContain(
        'corporationId: This corporation is no longer available. Choose another.',
      );
      expect(messages(valid({ accountType: 'CORPORATE', corporationId: 'c1' }))).toEqual([]);
    });

    it('sends no corporationId for an online account', () => {
      const payload = toCreatePayload(buildRepairFormSchema(LISTS).parse(valid({ corporationId: 'c1' })));
      expect(payload.corporationId).toBeUndefined();
    });
  });

  describe('issue description (AC-5)', () => {
    const blank = (knowledgeEntryId: string) =>
      valid({ issues: [{ knowledgeEntryId, categoryId: 'cat', rootCause: 'Unknown', description: '   ' }] });

    it('is required without a picked common issue, and for Other', () => {
      expect(messages(blank(''))).toContain('issues.0.description: Describe the issue.');
      expect(messages(blank(OTHER_ISSUE))).toContain('issues.0.description: Describe the issue.');
    });

    it('may be blank with a picked common issue, and is then left out of the payload', () => {
      expect(messages(blank('entry-1'))).toEqual([]);
      const payload = toCreatePayload(buildRepairFormSchema(LISTS).parse(blank('entry-1')));
      expect(payload.issues[0]).not.toHaveProperty('description');
      expect(payload.issues[0].knowledgeEntryId).toBe('entry-1');
    });
  });

  it('adds confirmOdometerJump to the payload only when confirmed (AC-7)', () => {
    const values = buildRepairFormSchema(LISTS).parse(valid());
    expect(toCreatePayload(values)).not.toHaveProperty('confirmOdometerJump');
    expect(toCreatePayload(values, { confirmOdometerJump: true }).confirmOdometerJump).toBe(true);
  });
});
