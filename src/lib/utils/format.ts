export function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildStatusClass(status: string) {
  switch (status) {
    case 'IN_PROGRESS':
      return 'status-chip status-in-progress';
    case 'FOR_VERIFICATION':
      return 'status-chip status-for-verification';
    case 'COMPLETED':
      return 'status-chip status-completed';
    case 'CANCELLED':
      return 'status-chip status-cancelled';
    default:
      return 'status-chip status-pending';
  }
}

// Spec 0002 and 0003 text rules. Dates and times read in the browser's local time.

const pesoFormat = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 });

export function formatPeso(amount: number) {
  return `₱${pesoFormat.format(amount)}`;
}

const pesoExactFormat = new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** `₱1,250.50`: centavos kept, for cost entry on the repair detail page (spec 0004). */
export function formatPesoExact(amount: number) {
  return `₱${pesoExactFormat.format(amount)}`;
}

const hoursFormat = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 });

/** `2 h`, `1.5 h`, `0.25 h` (spec 0007). */
export function formatHours(hours: number) {
  return `${hoursFormat.format(hours)} h`;
}

/** `Oct 22, 2026` */
export function formatShortDate(value: string | Date) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** `10:42 AM` */
export function formatClockTime(value: string | Date) {
  return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/** `Oct 22, 2026, 10:42 AM`, for tooltips. */
export function formatDateTime(value: string | Date) {
  return `${formatShortDate(value)}, ${formatClockTime(value)}`;
}

/** `October 2026` */
export function formatMonthHeading(value: string | Date) {
  return new Date(value).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Local `YYYY-MM` key for grouping by month. */
export function monthKey(value: string | Date) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Local `YYYY-MM-DD` key for grouping by day. */
export function dayKey(value: string | Date) {
  const d = new Date(value);
  return `${monthKey(d)}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "Today", "Yesterday", else `Mon, Oct 18`, plus `, 2025` outside the current year. Calendar days, not 24 hour blocks. */
export function formatDayHeading(value: string | Date, now: Date = new Date()) {
  const d = new Date(value);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (dayKey(d) === dayKey(now)) return 'Today';
  if (dayKey(d) === dayKey(yesterday)) return 'Yesterday';
  const text = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return d.getFullYear() === now.getFullYear() ? text : `${text}, ${d.getFullYear()}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from `from` to `to`, rounded down: "Same day", "1 day" or "N days". */
export function formatDuration(from: string, to: string) {
  const days = Math.max(0, Math.floor((Date.parse(to) - Date.parse(from)) / DAY_MS));
  if (days === 0) return 'Same day';
  return days === 1 ? '1 day' : `${days} days`;
}

/** Two letters for an avatar: first and last word of the name, else its first two letters. */
export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.trim().slice(0, 2);
  return letters.toUpperCase();
}
