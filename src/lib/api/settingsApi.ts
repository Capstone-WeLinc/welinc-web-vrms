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

/**
 * One row of the merged history of setting and lookup changes (spec 0012, AC-26). Permission
 * changes are in the portal since suite spec 0013 (AC-30).
 */
export interface HistoryChange {
  id: string;
  kind: 'setting' | 'lookup';
  key: string;
  label: string;
  /** Always null since permission rows left this history. */
  roleLabel: string | null;
  /** The value on each side. */
  before: number | boolean | string | { name: string; isActive: boolean } | null;
  after: number | boolean | string | { name: string; isActive: boolean } | null;
  action: 'SET' | 'RESET' | 'CREATE' | 'RENAME' | 'DEACTIVATE' | 'REACTIVATE' | null;
  actor: { name: string | null; email: string | null } | null;
  note: string | null;
  createdAt: string;
}

export type HistoryKind = 'all' | 'setting' | 'lookup';

/**
 * Newest first, 20 per page by default. Needs settings.manage. `keys` keeps only those keys'
 * rows (sorted and joined into one comma separated string, 1 to 50 keys, AC-31); send the same
 * `kind` and `keys` on every page.
 */
export async function getSettingChanges(params: {
  limit?: number;
  cursor?: string;
  kind?: HistoryKind;
  keys?: string[];
}) {
  const { keys, ...rest } = params;
  const response = await api.get<{ data: HistoryChange[]; nextCursor: string | null }>('/vrms/settings/changes', {
    params: keys ? { ...rest, keys: [...new Set(keys)].sort().join(',') } : rest,
    quiet: true,
  });
  return response.data;
}
