import { describe, expect, it } from 'vitest';
import type { Setting } from '../../../lib/api/settingsApi';
import { dependentsTurningOff, missingRequirements, reasonError } from './modules';
import { groupValues, hasInvalidEdit, isCustom, pendingChanges, shownText, thresholdError } from './thresholds';

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

  it('saves a yes or no value as a boolean and never flags it invalid (spec 0015)', () => {
    const toggle = value({ key: 'tickets.require_costs_to_close', type: 'boolean', default: false, value: false, min: null, max: null, unit: null, module: null });
    expect(pendingChanges([toggle], { [toggle.key]: { kind: 'value', text: 'true' } })).toEqual([{ key: toggle.key, value: true }]);
    expect(pendingChanges([toggle], { [toggle.key]: { kind: 'value', text: 'false' } })).toEqual([]);
    expect(hasInvalidEdit([toggle], { [toggle.key]: { kind: 'value', text: 'true' } })).toBe(false);
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

describe('shownText and groupValues (spec 0012, AC-23)', () => {
  it('shows the edit, the default after a reset, else the saved value', () => {
    const setting = value({ value: 5, default: 2, isDefault: false });
    expect(shownText(setting, undefined)).toBe('5');
    expect(shownText(setting, { kind: 'value', text: '7' })).toBe('7');
    expect(shownText(setting, { kind: 'reset' })).toBe('2');
  });

  it('groups only value settings by their catalog group, in catalog order', () => {
    const groups = groupValues([
      mod('module.ai', true),
      value({ key: 'a', group: 'Knowledge base' }),
      value({ key: 'b', group: 'Repairs' }),
      value({ key: 'c', group: 'Knowledge base' }),
    ]);
    expect(groups.map((g) => g.group)).toEqual(['Knowledge base', 'Repairs']);
    expect(groups[0].settings.map((s) => s.key)).toEqual(['a', 'c']);
  });

  it('gives no groups when there are no values', () => {
    expect(groupValues([mod('module.ai', true)])).toEqual([]);
  });
});
