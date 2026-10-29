import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sonner = vi.hoisted(() => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() } }));
vi.mock('sonner', () => sonner);

import { showToast } from '../../context/toast';
import { DENIED_MESSAGE, DENIED_TOAST_MS } from '../permissions/keys';
import { getApiErrorMessage } from './errors';

function httpError(status: number, message: string | string[]) {
  const response = { status, data: { message } } as AxiosResponse;
  return new AxiosError('failed', 'ERR', undefined, undefined, response);
}

// Spec 0011, AC-24
describe('a 403 reads the same everywhere', () => {
  it('replaces the body text of a permission denial', () => {
    expect(getApiErrorMessage(httpError(403, 'You do not have permission to do that.'), 'fallback')).toBe(DENIED_MESSAGE);
    expect(getApiErrorMessage(httpError(403, 'You are not assigned to this repair ticket'), 'fallback')).toBe(DENIED_MESSAGE);
  });

  it('keeps the text of a locked account, which the sign out flow shows', () => {
    const message = 'Account is locked. Contact your Admin to unlock.';
    expect(getApiErrorMessage(httpError(403, message), 'fallback')).toBe(message);
  });

  it('leaves other statuses alone', () => {
    expect(getApiErrorMessage(httpError(409, 'Duplicate name'), 'fallback')).toBe('Duplicate name');
    expect(getApiErrorMessage(httpError(400, ['a', 'b']), 'fallback')).toBe('a, b');
  });
});

describe('the denied toast', () => {
  beforeEach(() => {
    // The clock only moves forward, so a toast from an earlier test is always outside the window
    vi.useFakeTimers({ now: Date.now() });
    vi.advanceTimersByTime(DENIED_TOAST_MS + 1);
    sonner.toast.error.mockClear();
  });

  it('shows once, however many callers raise it inside the window', () => {
    showToast(DENIED_MESSAGE, 'error');
    showToast(DENIED_MESSAGE, 'error');
    showToast(DENIED_MESSAGE, 'error');
    expect(sonner.toast.error).toHaveBeenCalledTimes(1);
  });

  it('shows again after the window', () => {
    showToast(DENIED_MESSAGE, 'error');
    vi.advanceTimersByTime(DENIED_TOAST_MS + 1);
    showToast(DENIED_MESSAGE, 'error');
    expect(sonner.toast.error).toHaveBeenCalledTimes(2);
  });

  it('never holds back other error toasts', () => {
    showToast('Something else', 'error');
    showToast('Something else', 'error');
    expect(sonner.toast.error).toHaveBeenCalledTimes(2);
  });
});
