import type { ActivityCatalog, ActivityEvent } from '../api/activityApi';
import type { SystemView } from '../../types';

// Spec 0011, AC-19 and AC-20: how an account event reads. Pure, so Vitest covers it.

/** Activity days and times are Asia/Manila whatever the device's zone (spec 0011, value sourcing). */
const MANILA_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' });
const MANILA_HEADING = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric' });
const MANILA_YEAR = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric' });
const MANILA_TIME = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true });
const MANILA_FULL = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});

const valid = (value: string | Date) => Number.isFinite(new Date(value).getTime());

/** `2026-11-12`, the Manila calendar day. */
export function manilaDayKey(value: string | Date): string {
  return valid(value) ? MANILA_DAY.format(new Date(value)) : '';
}

/** "Today", "Yesterday", else `Mon, Nov 10`, plus `, 2025` outside this year; all in Manila days. */
export function manilaDayHeading(value: string | Date, now: Date = new Date()): string {
  if (!valid(value)) return '—';
  const key = manilaDayKey(value);
  if (key === manilaDayKey(now)) return 'Today';
  if (key === manilaDayKey(new Date(now.getTime() - 86_400_000))) return 'Yesterday';
  const date = new Date(value);
  const text = MANILA_HEADING.format(date);
  return MANILA_YEAR.format(date) === MANILA_YEAR.format(now) ? text : `${text}, ${MANILA_YEAR.format(date)}`;
}

/** `10:42 AM` in Manila. */
export function manilaTime(value: string | Date): string {
  return valid(value) ? MANILA_TIME.format(new Date(value)) : '—';
}

/** `Nov 12, 2026, 10:42:05 AM` in Manila, for the time's tooltip. */
export function manilaFull(value: string | Date): string {
  return valid(value) ? `${MANILA_FULL.format(new Date(value))} (Manila time)` : '—';
}

export interface ActivityDay {
  key: string;
  heading: string;
  events: ActivityEvent[];
}

/** Newest first events, grouped by Manila day in the order they came. */
export function groupByDay(events: ActivityEvent[], now: Date = new Date()): ActivityDay[] {
  const days: ActivityDay[] = [];
  for (const event of events) {
    const key = manilaDayKey(event.createdAt);
    const last = days[days.length - 1];
    if (last && last.key === key) last.events.push(event);
    else days.push({ key, heading: manilaDayHeading(event.createdAt, now), events: [event] });
  }
  return days;
}

/** The lookups a row needs: the catalog and the systems list (for role and system names). */
export interface ActivityLabels {
  catalog: ActivityCatalog | null;
  systems: SystemView[];
}

function systemName(code: string | null, labels: ActivityLabels): string | null {
  if (!code) return null;
  return labels.systems.find((s) => s.code === code)?.name ?? code;
}

/** `MECHANIC@VRMS,ADMIN@BMS` as role names: `Mechanic, Admin`. An empty side reads "no role". */
export function rolesText(value: string | null, labels: ActivityLabels): string {
  if (!value) return 'no role';
  return value
    .split(',')
    .filter(Boolean)
    .map((entry) => {
      const [role, system] = entry.split('@');
      const found = labels.systems.find((s) => s.code === system)?.roles.find((r) => r.code === role);
      return found?.name ?? role;
    })
    .join(', ');
}

const FIELD_NAMES: Record<string, string> = { name: 'name', email: 'email', contact: 'phone number', roles: 'role' };

/**
 * The row's title. The catalog label, `labelAdmin` when an admin did it to you (`viewer: 'self'`),
 * and what the event is about (the system opened, the fail reason, the roles).
 */
export function eventTitle(event: ActivityEvent, labels: ActivityLabels, viewer: 'self' | 'admin'): string {
  const type = labels.catalog?.types.find((t) => t.code === event.type);
  const base = type ? (viewer === 'self' && event.actor.kind === 'ADMIN' ? type.labelAdmin : type.label) : event.type;
  const reason = event.reason ? (labels.catalog?.reasons.find((r) => r.code === event.reason)?.label ?? event.reason) : null;
  const system = systemName(event.system, labels);

  switch (event.type) {
    case 'SYSTEM_OPENED':
      return system ? `Opened ${system}` : base;
    case 'SIGN_IN_FAILED': {
      const left = event.attemptsLeft != null ? ` (${event.attemptsLeft} ${event.attemptsLeft === 1 ? 'try' : 'tries'} left)` : '';
      return reason ? `${base}: ${reason}${left}` : base;
    }
    case 'SESSION_ENDED':
    case 'CODE_SENT':
    case 'CODE_MAIL_FAILED':
    case 'CODE_USED':
    case 'CODE_RETIRED':
      return reason ? `${base}: ${reason}` : base;
    case 'ROLE_CHANGED': {
      const where = system ? ` in ${system}` : '';
      return `${base}${where}: ${rolesText(event.oldValue, labels)} to ${rolesText(event.newValue, labels)}`;
    }
    case 'UPDATED':
      return event.field ? `${base}: ${FIELD_NAMES[event.field] ?? event.field}` : base;
    default:
      return base;
  }
}

/** True for the events worth a warning look: refused sign ins, lockouts, dead codes, failed mail. */
export function isWarning(event: ActivityEvent): boolean {
  return ['SIGN_IN_FAILED', 'LOCKED_OUT', 'CODE_RETIRED', 'CODE_MAIL_FAILED'].includes(event.type);
}

/** "Philippines · Globe Telecom", "Local network", or null when there is no place (AC-19). */
export function placeText(event: Pick<ActivityEvent, 'localNetwork' | 'country' | 'network'>): string | null {
  if (event.localNetwork) return 'Local network';
  const country = event.country ? countryName(event.country) : null;
  const parts = [country, event.network].filter((p): p is string => !!p);
  return parts.length > 0 ? parts.join(' · ') : null;
}

const REGIONS = new Intl.DisplayNames(['en'], { type: 'region' });

function countryName(code: string): string {
  try {
    return REGIONS.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** Device, address and place, the parts that are known, for the row's second line. */
export function whereText(event: ActivityEvent): string {
  return [event.device, event.address, placeText(event)].filter((p): p is string => !!p).join(', ');
}
