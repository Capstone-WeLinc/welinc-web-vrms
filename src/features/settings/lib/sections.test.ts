import { describe, expect, it } from 'vitest';
import type { PermissionKey } from '../../../lib/permissions/keys';
import { allowedSections, SETTINGS_KEYS, SETTINGS_SECTIONS } from './sections';

// Spec 0012, AC-21 and spec 0016, AC-21: six sections, each at its own path and shown only with its key

const holding = (...keys: PermissionKey[]) => (key: PermissionKey) => keys.includes(key);
const paths = (can: (key: PermissionKey) => boolean) => allowedSections(can).map((s) => s.path);

describe('SETTINGS_SECTIONS', () => {
  it('lists the six sections in the spec order, each at its own path (AC-21)', () => {
    expect(SETTINGS_SECTIONS.map((s) => s.path)).toEqual(['modules', 'thresholds', 'lookups', 'vehicles', 'history']);
  });

  it('gives every section a label and a description, and no path twice', () => {
    for (const section of SETTINGS_SECTIONS) {
      expect(section.label.length).toBeGreaterThan(0);
      expect(section.description.length).toBeGreaterThan(0);
    }
    expect(new Set(SETTINGS_SECTIONS.map((s) => s.path)).size).toBe(SETTINGS_SECTIONS.length);
  });

  it('ties each section to the key the spec names (AC-21)', () => {
    const keyOf = Object.fromEntries(SETTINGS_SECTIONS.map((s) => [s.path, s.permission]));

    expect(keyOf).toEqual({
      modules: 'settings.manage',
      thresholds: 'settings.manage',
      lookups: 'lookups.manage',
      vehicles: 'vehicle.manage',
      history: 'settings.manage',
    });
  });
});

describe('allowedSections', () => {
  it('shows an Admin every section', () => {
    expect(paths(holding('settings.manage', 'lookups.manage', 'vehicle.manage'))).toEqual([
      'modules',
      'thresholds',
      'lookups',
      'vehicles',
      'history',
    ]);
  });

  it('shows a Chief Mechanic only Lookup lists (AC-18, AC-21)', () => {
    expect(paths(holding('lookups.manage', 'knowledge.edit'))).toEqual(['lookups']);
  });

  it('shows a Mechanic nothing', () => {
    expect(paths(holding('ticket.view', 'ticket.work'))).toEqual([]);
  });

  it('keeps the spec order when the keys are held in another order', () => {
    expect(paths(holding('lookups.manage', 'settings.manage'))).toEqual([
      'modules',
      'thresholds',
      'lookups',
      'history',
    ]);
  });

  it('has no Roles and permissions section: the matrix is edited in the portal (suite spec 0013, AC-30)', () => {
    expect(SETTINGS_SECTIONS.map((s) => s.path)).not.toContain('roles');
  });
});

describe('SETTINGS_KEYS', () => {
  it('is the three keys that show the Settings nav item, each once (AC-21)', () => {
    expect([...SETTINGS_KEYS].sort()).toEqual(['lookups.manage', 'settings.manage', 'vehicle.manage']);
  });
});
