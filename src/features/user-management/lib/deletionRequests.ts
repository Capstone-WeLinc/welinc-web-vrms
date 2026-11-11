// Suite spec 0012, AC-23: the Users page Deletion requests chip and view.

/** The chip's count: one page at most, "50+" past it (Value sourcing: page length plus nextCursor). */
export function pendingCountLabel(count: number, hasMore: boolean): string {
  return hasMore ? `${count}+` : String(count);
}

/** The chip's accessible name, so a screen reader hears the count with the words. */
export function pendingChipLabel(count: number, hasMore: boolean): string {
  if (count === 0) return 'Deletion requests, none waiting';
  return `Deletion requests, ${pendingCountLabel(count, hasMore)} waiting`;
}

/** Server codes an admin decision can answer, in the page's own words. */
export function decisionFailureMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'NOT_PENDING':
      return 'Someone already decided this request, or the person cancelled it.';
    case 'LAST_ADMIN':
      return 'This person is the last admin of one of their systems. Make someone else an admin first.';
    case 'SELF_DECISION':
      return 'You can’t decide your own deletion request. Another admin has to.';
    case 'NOT_RESTORABLE':
      return 'This account can’t be restored any more.';
    default:
      return fallback;
  }
}
