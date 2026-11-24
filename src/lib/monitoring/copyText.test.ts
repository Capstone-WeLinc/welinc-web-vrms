import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPY_LABEL, copyText } from './copyText';

// covers: VRMS spec 0025 AC-7a

afterEach(() => vi.unstubAllGlobals());

describe('copyText', () => {
  it('copies the exact text and reports copied', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    expect(await copyText('line one\nline two')).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('line one\nline two');
  });

  it('falls back to manual when the write is refused', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: () => Promise.reject(new Error('denied')) } });

    expect(await copyText('x')).toBe('manual');
  });

  it('falls back to manual when the browser has no clipboard API (a page that is not secure)', async () => {
    vi.stubGlobal('navigator', {});

    expect(await copyText('x')).toBe('manual');
  });

  it('falls back to manual with no navigator at all', async () => {
    vi.stubGlobal('navigator', undefined);

    expect(await copyText('x')).toBe('manual');
  });
});

describe('COPY_LABEL', () => {
  it('names each state as the spec words it', () => {
    expect(COPY_LABEL).toEqual({
      idle: 'Copy details',
      copied: 'Copied',
      manual: 'Select and copy the text above',
    });
  });
});
