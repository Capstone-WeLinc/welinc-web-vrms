import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sonner = vi.hoisted(() => ({ toast: { custom: vi.fn(), dismiss: vi.fn() } }));
vi.mock('sonner', () => sonner);

import { showToast } from '../../context/toast';
import { DENIED_MESSAGE, DENIED_TOAST_MS } from '../permissions/keys';
import { ADMIN_CODE_MESSAGE, getApiErrorMessage, getDisabledModule, getDriverExists, getInvalidTransition, isAdminCodeRequired } from './errors';

function httpError(status: number, message: string | string[], code?: string) {
  const response = { status, data: { message, code } } as AxiosResponse;
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

function bodyError(status: number, data: unknown) {
  const response = { status, data } as AxiosResponse;
  return new AxiosError('failed', 'ERR', undefined, undefined, response);
}

// Spec 0012, AC-11
describe('getDisabledModule', () => {
  it('names the module of a 403 MODULE_DISABLED body', () => {
    const body = { statusCode: 403, code: 'MODULE_DISABLED', module: 'knowledge', message: 'This module is turned off by your Admin.' };

    expect(getDisabledModule(bodyError(403, body))).toBe('knowledge');
    expect(getDisabledModule(bodyError(403, { ...body, module: 'ai' }))).toBe('ai');
  });

  it('answers null for an ordinary permission denial', () => {
    expect(getDisabledModule(bodyError(403, { statusCode: 403, message: 'You do not have permission to do that.' }))).toBeNull();
  });

  it('answers null when the code matches but the status is not 403', () => {
    expect(getDisabledModule(bodyError(500, { code: 'MODULE_DISABLED', module: 'ai' }))).toBeNull();
  });

  it('answers null when the body names no module, or has no body', () => {
    expect(getDisabledModule(bodyError(403, { code: 'MODULE_DISABLED' }))).toBeNull();
    expect(getDisabledModule(bodyError(403, undefined))).toBeNull();
  });

  it('answers null for an error that did not come from a response', () => {
    expect(getDisabledModule(new Error('Network Error'))).toBeNull();
    expect(getDisabledModule(undefined)).toBeNull();
    expect(getDisabledModule(new AxiosError('timeout', 'ECONNABORTED'))).toBeNull();
  });
});

describe('the denied toast', () => {
  beforeEach(() => {
    // The clock only moves forward, so a toast from an earlier test is always outside the window
    vi.useFakeTimers({ now: Date.now() });
    vi.advanceTimersByTime(DENIED_TOAST_MS + 1);
    sonner.toast.custom.mockClear();
  });

  it('shows once, however many callers raise it inside the window', () => {
    showToast(DENIED_MESSAGE, 'error');
    showToast(DENIED_MESSAGE, 'error');
    showToast(DENIED_MESSAGE, 'error');
    expect(sonner.toast.custom).toHaveBeenCalledTimes(1);
  });

  it('shows again after the window', () => {
    showToast(DENIED_MESSAGE, 'error');
    vi.advanceTimersByTime(DENIED_TOAST_MS + 1);
    showToast(DENIED_MESSAGE, 'error');
    expect(sonner.toast.custom).toHaveBeenCalledTimes(2);
  });

  it('never holds back other error toasts', () => {
    showToast('Something else', 'error');
    showToast('Something else', 'error');
    expect(sonner.toast.custom).toHaveBeenCalledTimes(2);
  });
});

// Spec 0014, AC-19
describe('getInvalidTransition', () => {
  it('returns the server message on a 400 INVALID_TRANSITION', () => {
    const message = 'A ticket goes On hold when a hold is filed, not from here.';
    expect(getInvalidTransition(httpError(400, message, 'INVALID_TRANSITION'))).toBe(message);
  });

  it('falls back to a plain sentence when the body has no message', () => {
    const response = { status: 400, data: { code: 'INVALID_TRANSITION' } } as AxiosResponse;
    const err = new AxiosError('failed', 'ERR', undefined, undefined, response);
    expect(getInvalidTransition(err)).toBe('That move isn’t possible any more.');
  });

  it('ignores other 400s, other statuses and non http errors', () => {
    expect(getInvalidTransition(httpError(400, 'Say what needs fixing.'))).toBeNull();
    expect(getInvalidTransition(httpError(409, 'stale', 'INVALID_TRANSITION'))).toBeNull();
    expect(getInvalidTransition(new Error('boom'))).toBeNull();
  });
});

// Spec 0019, AC-4: the detail page reloads on a stale 409 but must let DRIVER_EXISTS reach the edit dialog
describe('telling a driver conflict from a stale ticket', () => {
  it('reads the owner of the license from a DRIVER_EXISTS 409', () => {
    const response = { status: 409, data: { code: 'DRIVER_EXISTS', driver: { id: 'd-1', name: 'Alvin Sarmiento' } } } as AxiosResponse;
    const err = new AxiosError('failed', 'ERR', undefined, undefined, response);
    expect(getDriverExists(err)).toEqual({ id: 'd-1', name: 'Alvin Sarmiento' });
  });

  it('does not take a stale ticket 409 for a driver conflict', () => {
    expect(getDriverExists(httpError(409, 'This ticket has been updated by another user.'))).toBeNull();
    expect(getDriverExists(httpError(409, 'stale', 'STALE_TICKET'))).toBeNull();
  });
});

// Suite spec 0013, AC-31
describe('a 403 ADMIN_CODE_REQUIRED', () => {
  it('says to confirm the sign in in the portal instead of the denied text', () => {
    const err = httpError(403, 'Confirm this sign in with the code we email you first', 'ADMIN_CODE_REQUIRED');
    expect(isAdminCodeRequired(err)).toBe(true);
    expect(getApiErrorMessage(err, 'fallback')).toBe(ADMIN_CODE_MESSAGE);
  });

  it('leaves other 403s as a permission denial', () => {
    const err = httpError(403, 'Nope', 'WRONG_AUDIENCE');
    expect(isAdminCodeRequired(err)).toBe(false);
    expect(getApiErrorMessage(err, 'fallback')).toBe(DENIED_MESSAGE);
  });
});
