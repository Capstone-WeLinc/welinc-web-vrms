import { isAxiosError } from 'axios';

// Pull the backend's `message` out of an axios error, falling back when there is none
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError<{ message?: string | string[] }>(err)) {
    const message = err.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (message) return message;
  }
  return fallback;
}

export function getApiErrorStatus(err: unknown): number | undefined {
  return isAxiosError(err) ? err.response?.status : undefined;
}

/** The 409 body welinc-auth sends when an email already has a WeLinc account (spec 0011, AC-30). */
export function getAccountExists(err: unknown): { id: string; name: string; systems: string[] } | null {
  if (!isAxiosError<{ code?: string; id?: string; name?: string; systems?: string[] }>(err) || err.response?.status !== 409) return null;
  const body = err.response.data;
  if (body?.code !== 'ACCOUNT_EXISTS' || !body.id || !body.name) return null;
  return { id: body.id, name: body.name, systems: body.systems ?? [] };
}

/** The `code` on a 409 body, such as STALE or DUPLICATE_NAME (spec 0007, AC-20). */
export function getConflictCode(err: unknown): string | undefined {
  if (!isAxiosError<{ code?: string }>(err) || err.response?.status !== 409) return undefined;
  return err.response.data?.code;
}
