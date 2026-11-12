import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { LOCKED_MESSAGE, passwordCheckFailure } from './passwordCheck';

// covers: suite spec 0012 AC-2 (wrong password shows the tries left, a lock says so)

function failure(status: number, data: unknown) {
  const response = { status, data, headers: {}, statusText: '', config: { headers: new AxiosHeaders() } } as AxiosResponse;
  return new AxiosError('failed', String(status), undefined, undefined, response);
}

describe('passwordCheckFailure', () => {
  it('counts down the tries left on a wrong password', () => {
    expect(passwordCheckFailure(failure(400, { code: 'WRONG_PASSWORD', attemptsLeft: 4 }))).toEqual({
      kind: 'wrong',
      message: 'That password isn’t right. 4 tries left before your account locks.',
    });
  });

  it('says "try" for the last one', () => {
    const result = passwordCheckFailure(failure(400, { code: 'WRONG_PASSWORD', attemptsLeft: 1 }));
    expect(result?.message).toContain('1 try left');
  });

  it('treats a missing attemptsLeft as none left', () => {
    const result = passwordCheckFailure(failure(400, { code: 'WRONG_PASSWORD' }));
    expect(result?.message).toContain('0 tries left');
  });

  it('answers a locked account with the lock message', () => {
    expect(passwordCheckFailure(failure(403, { code: 'ACCOUNT_LOCKED' }))).toEqual({
      kind: 'locked',
      message: LOCKED_MESSAGE,
    });
  });

  it('answers null for an error about something else', () => {
    expect(passwordCheckFailure(failure(500, { code: 'SOMETHING_ELSE' }))).toBeNull();
  });

  it('answers null for an error that is not an axios error', () => {
    expect(passwordCheckFailure(new Error('boom'))).toBeNull();
    expect(passwordCheckFailure(undefined)).toBeNull();
  });
});
