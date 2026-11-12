import { isAxiosError } from 'axios';
import { passwordCheckFailure } from './passwordCheck';

// Suite spec 0009, AC-27: where each failure of changing your own email shows.

export type EmailChangeFailure =
  /** Under one field of the dialog. */
  | { kind: 'field'; field: 'newEmail' | 'currentPassword' | 'code'; message: string }
  /** Above the dialog's buttons. */
  | { kind: 'form'; message: string }
  /** The code or the change is gone: back to the first step. */
  | { kind: 'expired'; message: string };

export const CHANGE_EXPIRED_MESSAGE = 'That code expired. Start again to get a new one.';

type Body = { code?: string; message?: string | string[]; attemptsLeft?: number };

export function emailChangeFailure(err: unknown): EmailChangeFailure {
  // Suite spec 0012, AC-2: the shared password recheck and its lockout
  const password = passwordCheckFailure(err);
  if (password?.kind === 'wrong') return { kind: 'field', field: 'currentPassword', message: password.message };
  if (password?.kind === 'locked') return { kind: 'form', message: password.message };
  const response = isAxiosError<Body>(err) ? err.response : undefined;
  const body = response?.data;
  const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
  switch (body?.code) {
    case 'INVALID_CODE': {
      const left = body.attemptsLeft ?? 0;
      return { kind: 'field', field: 'code', message: `That code isn’t right. ${left} ${left === 1 ? 'try' : 'tries'} left.` };
    }
    case 'CODE_EXPIRED':
      return { kind: 'expired', message: CHANGE_EXPIRED_MESSAGE };
    case 'SAME_EMAIL':
      return { kind: 'field', field: 'newEmail', message: 'That’s already your email.' };
    case 'EMAIL_TAKEN':
      return { kind: 'field', field: 'newEmail', message: 'Another account already uses this email.' };
    case 'MAIL_FAILED':
      return { kind: 'form', message: 'We couldn’t send your code. Try again in a minute.' };
    case 'CODE_SEND_LIMIT':
      return { kind: 'form', message: message ?? 'Too many codes sent. Try again later.' };
  }
  if (response?.status === 400 && message && /email domain/i.test(message)) {
    return { kind: 'field', field: 'newEmail', message: 'That email’s domain can’t receive mail. Check the address.' };
  }
  if (!response) return { kind: 'form', message: 'Check your connection and try again.' };
  return { kind: 'form', message: message ?? 'Something went wrong. Try again.' };
}
