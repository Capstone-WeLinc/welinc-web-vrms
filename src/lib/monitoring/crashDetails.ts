import { redact } from './redact';

// VRMS spec 0025, AC-7a: the text in the admin crash screen's details box, and exactly what Copy
// details puts on the clipboard. Pure, so the box and the copy can never differ.

/** What the boundary stores when a page crashes (in getDerivedStateFromError, before any draw). */
export interface CaughtCrash {
  error: unknown;
  /** `location.pathname` at the crash: no query, no hash. */
  path: string;
  at: Date;
}

export interface CrashFacts {
  path: string;
  at: Date;
  app: string;
  release: string;
  code?: string;
}

const MESSAGE_LIMIT = 300;

/** `name: message`, with emails and tokens redacted before the cut, so a token is never split. */
export function errorLine(error: unknown): string {
  let name = 'Error';
  let message: string;
  if (error instanceof Error || isErrorShaped(error)) {
    name = error.name || 'Error';
    message = error.message;
  } else {
    message = safeString(error);
  }
  const clean = redact(message.replace(/\s+/g, ' ').trim());
  const cut = clean.length > MESSAGE_LIMIT ? `${clean.slice(0, MESSAGE_LIMIT - 1)}…` : clean;
  return `${redact(name)}: ${cut}`;
}

/** The local date and time (`YYYY-MM-DD HH:mm:ss`, 24 hour), then the ISO time in UTC. */
export function crashTime(at: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const local =
    `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())} ` +
    `${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`;
  return `${local} (${at.toISOString()})`;
}

/** One item per line; the Code line only when there is a code. */
export function crashDetails(error: unknown, facts: CrashFacts): string {
  const lines = [
    errorLine(error),
    `Page: ${facts.path}`,
    `Time: ${crashTime(facts.at)}`,
    `App: ${facts.app} ${facts.release}`,
  ];
  if (facts.code) lines.push(`Code: ${facts.code}`);
  return lines.join('\n');
}

function isErrorShaped(value: unknown): value is { name: string; message: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { message?: unknown }).message === 'string' &&
    typeof (value as { name?: unknown }).name === 'string'
  );
}

function safeString(value: unknown): string {
  try {
    return String(value);
  } catch {
    // An object whose toString throws, or one with no prototype
    return 'a value that could not be shown';
  }
}
