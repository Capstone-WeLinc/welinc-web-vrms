// Development only: which dataset the Settings hub reads (break-ui). `?data=worst` in the URL
// wins and is kept in sessionStorage, so it survives the hub's own links, which drop the query.

export const DATA_MODES = [
  { value: 'demo', label: 'Demo data' },
  { value: 'worst', label: 'Worst case' },
  { value: 'empty', label: 'Empty' },
  { value: 'one', label: 'One' },
  { value: 'huge', label: '1,284 rows' },
] as const;

export type DataMode = (typeof DATA_MODES)[number]['value'];

const STORAGE_KEY = 'vrms.dev.dataMode';

function isDataMode(value: string | null): value is DataMode {
  return DATA_MODES.some((mode) => mode.value === value);
}

export function readDataMode(): DataMode {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('data');
    if (isDataMode(fromUrl)) {
      sessionStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl;
    }
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return isDataMode(stored) ? stored : 'demo';
  } catch {
    return 'demo';
  }
}

/** Reloads so every cache (the settings, the matrix, the module flags in the shell) reads again. */
export function switchDataMode(mode: DataMode) {
  try {
    sessionStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // The URL still carries it
  }
  const url = new URL(window.location.href);
  if (mode === 'demo') url.searchParams.delete('data');
  else url.searchParams.set('data', mode);
  window.location.replace(url);
}
