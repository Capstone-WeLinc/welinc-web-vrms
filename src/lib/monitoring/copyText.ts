// VRMS spec 0025, AC-7a: Copy details. No clipboard API (a page that isn't secure) or a refused
// write both fall back to asking the person to select the text, which stays selectable.

export type CopyResult = 'copied' | 'manual';
export type CopyState = 'idle' | CopyResult;

/** How long "Copied" shows before the button reads Copy details again. */
export const COPIED_MS = 2000;

export const COPY_LABEL: Record<CopyState, string> = {
  idle: 'Copy details',
  copied: 'Copied',
  manual: 'Select and copy the text above',
};

export async function copyText(text: string): Promise<CopyResult> {
  const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
  if (typeof clipboard?.writeText !== 'function') return 'manual';
  try {
    await clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'manual';
  }
}
