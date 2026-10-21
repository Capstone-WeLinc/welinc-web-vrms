// Fixed dropdown options and the locally remembered driver names for the repair form

const DRIVER_STORAGE_KEY = 'welinc_driver_names';

export const ACCOUNT_TYPE_OPTIONS = [
  { value: 'ONLINE', label: 'Online' },
  { value: 'CORPORATE', label: 'Corporate' },
] as const;

export const CORPORATION_OPTIONS = [
  'WeLinc Transport Corp',
  'Metro Freight Corp',
  'Global Logistics Inc',
] as const;

export const SHOP_OPTIONS = [
  'TireCare Garage',
  'ProFix Auto Shop',
  'City Repair Center',
  'Rapid Repair Hub',
] as const;

export const VEHICLE_SYSTEM_OPTIONS = [
  'Brakes',
  'Engine',
  'Electrical',
  'Suspension',
  'Cooling',
  'Transmission',
] as const;

export const ROOT_CAUSE_OPTIONS = [
  'Wear and tear',
  'Hydraulic leak',
  'Electrical fault',
  'Overheating',
  'Impact damage',
  'Unknown',
] as const;

export const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
] as const;

export function loadDriverNames(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(DRIVER_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) {
      return [];
    }

    return [...new Set(list.filter((name) => typeof name === 'string' && name.trim().length > 0))].slice(0, 20);
  } catch {
    return [];
  }
}

export function saveDriverName(name: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return;
  }

  const current = loadDriverNames();
  const next = [trimmed, ...current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 20);
  window.localStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(next));
}
