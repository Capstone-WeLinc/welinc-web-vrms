import { isAxiosError } from 'axios';
import { DENIED_MESSAGE, type ModuleName } from '../permissions/keys';

// Spec 0012, AC-11: what a 403 MODULE_DISABLED reads as, for every role
export const MODULE_OFF_MESSAGE = 'This module is turned off by your Admin.';

// Pull the backend's `message` out of an axios error, falling back when there is none
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError<{ message?: string | string[] }>(err)) {
    const message = err.response?.data?.message;
    // A 403 reads the same everywhere, whatever the body says (spec 0011, AC-24). A locked
    // account keeps its own text, because the sign out flow shows it.
    if (err.response?.status === 403 && !(typeof message === 'string' && message.startsWith('Account is locked'))) {
      return DENIED_MESSAGE;
    }
    if (Array.isArray(message)) return message.join(', ');
    if (message) return message;
  }
  return fallback;
}

/** The module named by a 403 MODULE_DISABLED body, or null for any other error (spec 0012, AC-11). */
export function getDisabledModule(err: unknown): ModuleName | null {
  if (!isAxiosError<{ code?: string; module?: ModuleName }>(err) || err.response?.status !== 403) return null;
  const body = err.response.data;
  return body?.code === 'MODULE_DISABLED' && body.module ? body.module : null;
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

/**
 * The server's message on a 400 INVALID_TRANSITION (spec 0014, AC-19): the move is no longer
 * possible, so the page says why and reloads. Null for any other error.
 */
export function getInvalidTransition(err: unknown): string | null {
  if (!isAxiosError<{ code?: string; message?: string }>(err) || err.response?.status !== 400) return null;
  const body = err.response.data;
  return body?.code === 'INVALID_TRANSITION' ? (body.message ?? 'That move isn’t possible any more.') : null;
}

/** The 409 body of a create on a truck that already has an open repair (spec 0016, AC-3). */
export function getOpenTicketExists(err: unknown): { message: string; ticket: { id: string; repairNumber: string } } | null {
  if (!isAxiosError<{ code?: string; message?: string; ticket?: { id: string; repairNumber: string } }>(err) || err.response?.status !== 409) {
    return null;
  }
  const body = err.response.data;
  if (body?.code !== 'OPEN_TICKET_EXISTS' || !body.ticket) return null;
  return { message: body.message ?? 'This truck already has an open repair.', ticket: body.ticket };
}

/** The `code` on a 409 body, such as STALE or DUPLICATE_NAME (spec 0007, AC-20). */
export function getConflictCode(err: unknown): string | undefined {
  if (!isAxiosError<{ code?: string }>(err) || err.response?.status !== 409) return undefined;
  return err.response.data?.code;
}
