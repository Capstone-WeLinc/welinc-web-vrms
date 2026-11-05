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

/**
 * The server's message on a 400 BEFORE_PHOTO_REQUIRED or AFTER_PHOTO_REQUIRED (spec 0018, AC-4 to
 * AC-6): a photo went missing since the ticket loaded. Null for any other error.
 */
export function getPhotoRequired(err: unknown): string | null {
  if (!isAxiosError<{ code?: string; message?: string }>(err) || err.response?.status !== 400) return null;
  const body = err.response.data;
  return body?.code === 'BEFORE_PHOTO_REQUIRED' || body?.code === 'AFTER_PHOTO_REQUIRED' ? (body.message ?? 'Add a photo first.') : null;
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

/** The 409 body of a create whose new driver's license already belongs to an active driver (spec 0016, AC-6). */
export function getDriverExists(err: unknown): { id: string; name: string } | null {
  if (!isAxiosError<{ code?: string; driver?: { id: string; name: string } }>(err) || err.response?.status !== 409) return null;
  const body = err.response.data;
  return body?.code === 'DRIVER_EXISTS' && body.driver ? body.driver : null;
}

export interface OdometerProblem {
  /** ODOMETER_ABOVE_NEXT comes only from a ticket edit (spec 0019, AC-5). */
  code: 'ODOMETER_BELOW_LAST' | 'ODOMETER_ABOVE_NEXT' | 'ODOMETER_JUMP_UNCONFIRMED';
  message: string;
  last: number;
}

const ODOMETER_CODES: OdometerProblem['code'][] = ['ODOMETER_BELOW_LAST', 'ODOMETER_ABOVE_NEXT', 'ODOMETER_JUMP_UNCONFIRMED'];

/** The 400 body of a reading below the last one, above a later ticket's, or a jump nobody confirmed (spec 0016, AC-7). */
export function getOdometerProblem(err: unknown): OdometerProblem | null {
  if (!isAxiosError<{ code?: string; message?: string; last?: number }>(err) || err.response?.status !== 400) return null;
  const body = err.response.data;
  const code = ODOMETER_CODES.find((c) => c === body?.code);
  if (!code) return null;
  return { code, message: body?.message ?? 'Check the odometer reading.', last: body?.last ?? 0 };
}

/** Spec 0023, AC-5: the per row messages of a 400 checklist save, by the row's place in the sent list. */
export function getFieldErrors(err: unknown): { index: number; message: string }[] {
  if (!isAxiosError<{ fieldErrors?: { index: number; message: string }[] }>(err) || err.response?.status !== 400) return [];
  return err.response.data?.fieldErrors ?? [];
}

/** The `code` on a 409 body, such as STALE or DUPLICATE_NAME (spec 0007, AC-20). */
export function getConflictCode(err: unknown): string | undefined {
  if (!isAxiosError<{ code?: string }>(err) || err.response?.status !== 409) return undefined;
  return err.response.data?.code;
}
