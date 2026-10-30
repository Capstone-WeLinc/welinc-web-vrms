import { describe, expect, it } from 'vitest';
import type { Setting } from '../../../lib/api/settingsApi';
import { dependentsTurningOff, missingRequirements, reasonError } from './modules';
import { hasInvalidEdit, isCustom, pendingChanges, thresholdError } from './thresholds';

function value(overrides: Partial<Setting> = {}): Setting {
  return {
    key: 'knowledge.repeat_threshold',
    kind: 'value',
    group: 'Knowledge base',
    label: 'Repairs that mark a repeat vehicle',
    description: '',
    type: 'int',
    unit: 'repairs',
    min: 2,
    max: 10,
    default: 2,
    value: 2,
    isDefault: true,
    hides: [],
    requires: [],
    module: 'knowledge',
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

function mod(key: string, on: boolean, requires: string[] = []): Setting {
  return value({ key, kind: 'module', type: 'boolean', default: true, value: on, requires, module: null, min: null, max: null, unit: null });
}

describe('thresholds (spec 0012, AC-23)', () => {
  it('checks whole numbers inside the range, like the server', () => {
    const s = value();
    expect(thresholdError(s, '3')).toBeNull();
    expect(thresholdError(s, '')).toBe('Enter a number.');
    expect(thresholdError(s, '2.5')).toBe('Enter a whole number.');
    expect(thresholdError(s, '11')).toBe('Enter a number from 2 to 10.');
  });

  it('sends only edits that change something', () => {
    const settings = [value(), value({ key: 'b', value: 5, isDefault: false })];
    expect(
      pendingChanges(settings, {
        'knowledge.repeat_threshold': { kind: 'value', text: '2' },
        b: { kind: 'reset' },
      }),
    ).toEqual([{ key: 'b', reset: true }]);
    expect(pendingChanges(settings, { 'knowledge.repeat_threshold': { kind: 'value', text: ' 4 ' } })).toEqual([
      { key: 'knowledge.repeat_threshold', value: 4 },
    ]);
  });

  it('blocks Save on an invalid edit and leaves it out of the changes', () => {
    const settings = [value()];
    const edits = { 'knowledge.repeat_threshold': { kind: 'value', text: 'x' } } as const;
    expect(hasInvalidEdit(settings, edits)).toBe(true);
    expect(pendingChanges(settings, edits)).toEqual([]);
  });

  it('shows Custom when the shown value differs from the default', () => {
    expect(isCustom(value(), undefined)).toBe(false);
    expect(isCustom(value({ value: 5, isDefault: false }), undefined)).toBe(true);
    expect(isCustom(value({ value: 5, isDefault: false }), { kind: 'reset' })).toBe(false);
    expect(isCustom(value(), { kind: 'value', text: '4' })).toBe(true);
  });
});

describe('modules (spec 0012, AC-9, AC-22)', () => {
  it('lists the modules that turn off with one, transitively', () => {
    const settings = [mod('module.a', true), mod('module.b', true, ['module.a']), mod('module.c', true, ['module.b']), mod('module.d', true)];
    expect(dependentsTurningOff(settings, 'module.a').map((s) => s.key)).toEqual(['module.b', 'module.c']);
    expect(dependentsTurningOff(settings, 'module.d')).toEqual([]);
  });

  it('names the required modules that are off', () => {
    const settings = [mod('module.a', false), mod('module.b', false, ['module.a'])];
    expect(missingRequirements(settings, settings[1]).map((s) => s.key)).toEqual(['module.a']);
  });

  it('needs a reason of 5 to 500 characters', () => {
    expect(reasonError('  abc ')).not.toBeNull();
    expect(reasonError('Testing the switch')).toBeNull();
    expect(reasonError('x'.repeat(501))).not.toBeNull();
  });
});
