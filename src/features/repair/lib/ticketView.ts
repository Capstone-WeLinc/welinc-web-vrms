// Spec 0024, AC-5: which issue rows are open and which hide their done steps, kept per ticket in
// this tab's sessionStorage. Pure helpers; `useTicketView` does the reading and writing.

export interface TicketView {
  open: string[];
  hideDone: string[];
}

/** The most tickets whose view is kept; older ones are dropped. */
export const MAX_TICKET_VIEWS = 20;

/** Ticket ids, most recent first, so the oldest view can be dropped. */
export const VIEW_INDEX_KEY = 'vrms.ticket.views';

export function viewKey(ticketId: string): string {
  return `vrms.ticket.${ticketId}.view`;
}

const isStringList = (value: unknown): value is string[] => Array.isArray(value) && value.every((v) => typeof v === 'string');

/** A stored view, checked; anything else reads as none. */
export function parseView(raw: string | null): TicketView | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const { open, hideDone } = value as Record<string, unknown>;
    if (!isStringList(open) || !isStringList(hideDone)) return null;
    return { open, hideDone };
  } catch {
    return null;
  }
}

/** Only issues still on the ticket; a removed issue drops out. */
export function pruneView(view: TicketView, issueIds: string[]): TicketView {
  const present = new Set(issueIds);
  return { open: view.open.filter((id) => present.has(id)), hideDone: view.hideDone.filter((id) => present.has(id)) };
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

/** Adds or removes one id. */
export function toggleId(list: string[], id: string, on: boolean): string[] {
  const without = list.filter((v) => v !== id);
  return on ? [...without, id] : without;
}
