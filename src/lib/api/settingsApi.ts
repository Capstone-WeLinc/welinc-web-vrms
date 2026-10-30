import api from './axios';
import type { ModuleName } from '../permissions/keys';

/** One catalog entry with its effective value (spec 0012, API surface). */
export interface Setting {
  key: string;
  kind: 'module' | 'value';
  group: string;
  label: string;
  description: string;
  type: 'int' | 'boolean';
  unit: string | null;
  min: number | null;
  max: number | null;
  default: number | boolean;
  value: number | boolean;
  /** No stored row: the catalog default applies. */
  isDefault: boolean;
  /** What turns off with a module, for the confirm dialog. */
  hides: string[];
  requires: string[];
  /** The module a value belongs to, for the "module is off" note. */
  module: ModuleName | null;
  updatedAt: string | null;
  updatedBy: { name: string | null; email: string | null } | null;
}

export interface SettingsView {
  version: number;
  settings: Setting[];
}

export type SettingChange = { key: string; value: number | boolean } | { key: string; reset: true };

export interface UpdateSettings {
  version: number;
  changes: SettingChange[];
  note?: string;
}

/** Every setting and the version a save must send back. Needs settings.manage. */
export async function getSettings(): Promise<SettingsView> {
  const response = await api.get<SettingsView>('/vrms/settings', { quiet: true });
  return response.data;
}

/** All or nothing; a stale version answers 409 and the caller reloads (AC-7, AC-27). */
export async function updateSettings(body: UpdateSettings): Promise<SettingsView> {
  const response = await api.patch<SettingsView>('/vrms/settings', body);
  return response.data;
}
