// Spec 0024, AC-5: which issue rows are open, kept per ticket in this tab's sessionStorage. Pure
// helpers; `useTicketView` does the reading and writing.

export interface TicketView {
  open: string[];
}

/** The most tickets whose view is kept; older ones are dropped. */
export const MAX_TICKET_VIEWS = 20;

/** Ticket ids, most recent first, so the oldest view can be dropped. */
export const VIEW_INDEX_KEY = 'vrms.ticket.views';

export function viewKey(ticketId: string): string {
  return `vrms.ticket.${ticketId}.view`;
}

const isStringList = (value: unknown): value is string[] => Array.isArray(value) && value.every((v) => typeof v === 'string');

/**
 * A stored view, checked; anything else reads as none. Older shapes carried a `hideDone` field (a
 * boolean, or a list of issue ids before that): it is ignored, and the next write drops it.
 */
export function parseView(raw: string | null): TicketView | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const { open } = value as Record<string, unknown>;
    return isStringList(open) ? { open } : null;
  } catch {
    return null;
  }
}

/** Only issues still on the ticket; a removed issue drops out. */
export function pruneView(view: TicketView, issueIds: string[]): TicketView {
  const present = new Set(issueIds);
  return { open: view.open.filter((id) => present.has(id)) };
}

/** Puts a ticket first and says which views fall past the limit. */
export function touchIndex(raw: string | null, ticketId: string, max = MAX_TICKET_VIEWS): { index: string[]; evicted: string[] } {
  let ids: string[] = [];
  try {
    const value: unknown = raw ? JSON.parse(raw) : [];
    if (isStringList(value)) ids = value;
  } catch {
    ids = [];
  }
  const index = [ticketId, ...ids.filter((id) => id !== ticketId)];
  return { index: index.slice(0, max), evicted: index.slice(max) };
}
