import { isAxiosError } from 'axios';

// Suite spec 0012, AC-2: every route that asks for your password again answers a wrong one the
// same way (400 WRONG_PASSWORD with attemptsLeft), and the 5th wrong one locks the account.

export type PasswordCheckFailure =
  | { kind: 'wrong'; message: string }
  | { kind: 'locked'; message: string };

export const LOCKED_MESSAGE = 'Your account is locked after too many wrong passwords. Ask an admin to unlock it.';

type Body = { code?: string; attemptsLeft?: number };

/** The failure for the password field, or null when the error is about something else. */
export function passwordCheckFailure(err: unknown): PasswordCheckFailure | null {
  const body = isAxiosError<Body>(err) ? err.response?.data : undefined;
  if (body?.code === 'WRONG_PASSWORD') {
    const left = body.attemptsLeft ?? 0;
    return {
      kind: 'wrong',
      message: `That password isn’t right. ${left} ${left === 1 ? 'try' : 'tries'} left before your account locks.`,
    };
  }
  if (body?.code === 'ACCOUNT_LOCKED') return { kind: 'locked', message: LOCKED_MESSAGE };
  return null;
}
