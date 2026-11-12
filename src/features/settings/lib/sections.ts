import { History, ListTree, Power, SlidersHorizontal, Truck, type LucideIcon } from 'lucide-react';
import type { PermissionKey } from '../../../lib/permissions/keys';

export interface SettingsSection {
  path: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** The key that shows the section (spec 0012, AC-21). */
  permission: PermissionKey;
}

// Spec 0012, AC-21, in order. Roles and permissions left with suite spec 0013 (AC-30): the matrix
// is edited in the portal, and SettingsSectionNav links there instead.
export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    path: 'modules',
    label: 'Modules',
    description: 'Turn AI, Analytics and the Knowledge base on or off.',
    icon: Power,
    permission: 'settings.manage',
  },
  {
    path: 'thresholds',
    label: 'Thresholds',
    description: 'The numbers behind repeat vehicles, typical times and suggestions.',
    icon: SlidersHorizontal,
    permission: 'settings.manage',
  },
  {
    path: 'lookups',
    label: 'Lookup lists',
    description: 'The lists behind dropdowns: issue categories, vehicle types and corporations.',
    icon: ListTree,
    permission: 'lookups.manage',
  },
  {
    path: 'vehicles',
    label: 'Vehicles',
    description: 'Set the type of each truck.',
    icon: Truck,
    permission: 'vehicle.manage',
  },
  {
    path: 'history',
    label: 'Change history',
    description: 'Who changed which setting or list, and why.',
    icon: History,
    permission: 'settings.manage',
  },
];

/** The keys that show the Settings nav item: any one section's key. */
export const SETTINGS_KEYS: PermissionKey[] = [...new Set(SETTINGS_SECTIONS.map((s) => s.permission))];

export function allowedSections(can: (key: PermissionKey) => boolean): SettingsSection[] {
  return SETTINGS_SECTIONS.filter((section) => can(section.permission));
}

// Spec 0012, AC-27
export const STALE_SETTINGS_TOAST = 'Someone else saved settings. The latest values are loaded, please make your change again.';
