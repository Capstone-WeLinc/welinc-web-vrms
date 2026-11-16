// VRMS spec 0025, AC-6: the last pass over any text a browser event carries. Mirrors the
// backend's src/monitoring/redact.ts; Sentry's own scrubbing also applies.

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
/** A JWT's three base64url parts; the header always starts with eyJ ("{"). */
const JWT = /\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g;
const BEARER = /\bBearer\s+[^\s"',;]+/gi;

/** Emails become `[email]`, JWT shaped strings `[token]`, and `Bearer <x>` `Bearer [token]`. */
export function redact(text: string): string {
  return text.replace(BEARER, 'Bearer [token]').replace(JWT, '[token]').replace(EMAIL, '[email]');
}
