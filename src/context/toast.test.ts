import { beforeEach, describe, expect, it, vi } from 'vitest';

const sonner = vi.hoisted(() => ({ toast: { custom: vi.fn(), dismiss: vi.fn() } }));
vi.mock('sonner', () => sonner);

import { MAX_TOASTS, pickToastToEvict, resetToastsForTests, showToast, TOAST_MS } from './toast';

// Suite spec 0016, AC-11
describe('toast timing', () => {
  it('keeps success and info 5 seconds, warnings 8, errors until closed', () => {
    expect(TOAST_MS).toEqual({ success: 5000, info: 5000, warning: 8000, error: Infinity });
  });
});

describe('pickToastToEvict', () => {
  it('leaves room while fewer than 3 show', () => {
    expect(pickToastToEvict([{ id: 1, type: 'error' }, { id: 2, type: 'success' }])).toBeNull();
  });

  it('drops the oldest non error first when full', () => {
    const list = [
      { id: 1, type: 'error' as const },
      { id: 2, type: 'info' as const },
      { id: 3, type: 'success' as const },
    ];
    expect(pickToastToEvict(list)?.id).toBe(2);
  });

  it('drops the oldest error when every toast is an error', () => {
    const list = [1, 2, 3].map((id) => ({ id, type: 'error' as const }));
    expect(pickToastToEvict(list)?.id).toBe(1);
  });
});

describe('showToast', () => {
  beforeEach(() => {
    resetToastsForTests();
    sonner.toast.custom.mockClear();
    sonner.toast.dismiss.mockClear();
  });

  it('dismisses one toast when a fourth arrives', () => {
    showToast('One', 'error');
    showToast('Two', 'success');
    showToast('Three', 'error');
    expect(sonner.toast.dismiss).not.toHaveBeenCalled();
    showToast('Four', 'info');
    expect(sonner.toast.dismiss).toHaveBeenCalledTimes(1);
    // "Two" was the oldest non error
    const twoId = sonner.toast.custom.mock.calls[1][1].id;
    expect(sonner.toast.dismiss).toHaveBeenCalledWith(twoId);
    expect(MAX_TOASTS).toBe(3);
  });

  it('replaces a toast with the same id instead of stacking', () => {
    showToast('Code needed', 'error', { id: 'admin-code-required' });
    showToast('Code needed', 'error', { id: 'admin-code-required' });
    showToast('A', 'error');
    showToast('B', 'error');
    expect(sonner.toast.dismiss).not.toHaveBeenCalled();
  });

  it('passes each type its duration', () => {
    showToast('Saved', 'success');
    showToast('Careful', 'warning');
    showToast('Broken', 'error');
    const durations = sonner.toast.custom.mock.calls.map((call) => call[1].duration);
    expect(durations).toEqual([5000, 8000, Infinity]);
  });
});
