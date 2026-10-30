import type { Setting } from '../../../lib/api/settingsApi';

// Spec 0012, AC-9 and AC-22: what the confirm dialog lists before a module switch.

export const REASON_MIN = 5;
export const REASON_MAX = 500;

/** The modules that are on and would turn off with this one, transitively, in catalog order. */
export function dependentsTurningOff(settings: Setting[], key: string): Setting[] {
  const off = new Set([key]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const setting of settings) {
      if (setting.kind !== 'module' || off.has(setting.key) || setting.value !== true) continue;
      if (setting.requires.some((required) => off.has(required))) {
        off.add(setting.key);
        grew = true;
      }
    }
  }
  return settings.filter((setting) => setting.key !== key && off.has(setting.key));
}

/** The modules this one needs that are off, which block turning it on. */
export function missingRequirements(settings: Setting[], module: Setting): Setting[] {
  return settings.filter((setting) => module.requires.includes(setting.key) && setting.value !== true);
}

/** Null when the reason is fine, else what is wrong with it (AC-8). */
export function reasonError(reason: string): string | null {
  const length = reason.trim().length;
  if (length < REASON_MIN) return `Give a reason of at least ${REASON_MIN} characters.`;
  if (length > REASON_MAX) return `Keep the reason under ${REASON_MAX} characters.`;
  return null;
}
