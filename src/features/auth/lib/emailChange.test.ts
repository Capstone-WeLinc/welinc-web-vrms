import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { CHANGE_EXPIRED_MESSAGE, emailChangeFailure } from './emailChange';

// covers: suite spec 0009 AC-27 (each failure of AC-17 to AC-19 lands on the right field)

function failure(status: number, data: unknown) {
  const response = { status, data, headers: {}, statusText: '', config: { headers: new AxiosHeaders() } } as AxiosResponse;
  return new AxiosError('failed', String(status), undefined, undefined, response);
}

describe('emailChangeFailure', () => {
  // Suite spec 0012, AC-2: the shared recheck answers WRONG_PASSWORD with the tries left
  it('puts a wrong password under the password field with the tries left', () => {
    expect(emailChangeFailure(failure(400, { code: 'WRONG_PASSWORD', attemptsLeft: 2 }))).toEqual({
      kind: 'field',
      field: 'currentPassword',
      message: 'That password isn’t right. 2 tries left before your account locks.',
    });
  });

  it('says a lock above the buttons', () => {
    expect(emailChangeFailure(failure(403, { code: 'ACCOUNT_LOCKED' }))).toMatchObject({ kind: 'form' });
  });

  it.each([
    ['SAME_EMAIL', 400],
    ['EMAIL_TAKEN', 409],
  ])('puts %s under the new email field', (code, status) => {
    expect(emailChangeFailure(failure(status, { code }))).toMatchObject({ kind: 'field', field: 'newEmail' });
  });

  it('puts a domain that cannot receive mail under the new email field', () => {
    expect(emailChangeFailure(failure(400, { message: 'Email domain does not exist or cannot receive mail' }))).toMatchObject({
      kind: 'field',
      field: 'newEmail',
    });
  });

  it('counts the tries left on a wrong code', () => {
    expect(emailChangeFailure(failure(400, { code: 'INVALID_CODE', attemptsLeft: 2 }))).toEqual({
      kind: 'field',
      field: 'code',
      message: 'That code isn’t right. 2 tries left.',
    });
    expect(emailChangeFailure(failure(400, { code: 'INVALID_CODE', attemptsLeft: 1 }))).toMatchObject({
      message: 'That code isn’t right. 1 try left.',
    });
  });

  it('sends an expired change back to the start', () => {
    expect(emailChangeFailure(failure(400, { code: 'CODE_EXPIRED' }))).toEqual({ kind: 'expired', message: CHANGE_EXPIRED_MESSAGE });
  });

  it('shows the send limit and mail failures above the buttons', () => {
    expect(
      emailChangeFailure(failure(429, { code: 'CODE_SEND_LIMIT', message: 'Too many codes sent. Try again in 3 minutes.' })),
    ).toEqual({ kind: 'form', message: 'Too many codes sent. Try again in 3 minutes.' });
    expect(emailChangeFailure(failure(503, { code: 'MAIL_FAILED' }))).toMatchObject({ kind: 'form' });
    expect(emailChangeFailure(new Error('offline'))).toEqual({ kind: 'form', message: 'Check your connection and try again.' });
  });
});
