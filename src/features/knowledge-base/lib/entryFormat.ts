import type { EntryStats, KnowledgeEntrySummary } from '../../../lib/api/knowledgeApi';
import { dayKey, formatPeso } from '../../../lib/utils/format';

const hoursFormat = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 });

/** `2 h`, `1.5 h`, `0.25 h` */
export function formatHours(hours: number) {
  return `${hoursFormat.format(hours)} h`;
}

/** `YYYY-MM-DD` in local time (design.md). */
export function formatDay(value: string) {
  return dayKey(value);
}

/**
 * The library row's meta line (AC-9): "Seen 12× · last 2026-10-20 · usually 2 h · about ₱3,450",
 * or "Not seen on a ticket yet". The estimate shows only when there is no median yet.
 */
export function entryMetaLine(entry: KnowledgeEntrySummary) {
  const parts = entry.seenCount > 0 && entry.lastSeenAt
    ? [`Seen ${entry.seenCount}×`, `last ${formatDay(entry.lastSeenAt)}`]
    : ['Not seen on a ticket yet'];
  if (entry.typicalHours != null) parts.push(`usually ${formatHours(entry.typicalHours)}`);
  else if (entry.estimatedHours != null) parts.push(`est. ${formatHours(entry.estimatedHours)}`);
  if (entry.typicalCost != null) parts.push(`about ${formatPeso(entry.typicalCost)}`);
  return parts.join(' · ');
}

/** Typical work time (AC-13): the median from 3 or more repairs, else the typed estimate. */
export function workTime(stats: Pick<EntryStats, 'typicalHours' | 'hoursSamples' | 'estimatedHours'>) {
  if (stats.typicalHours != null) return { value: formatHours(stats.typicalHours), label: `From ${stats.hoursSamples} repairs` };
  if (stats.estimatedHours != null) return { value: formatHours(stats.estimatedHours), label: 'Estimate' };
  return null;
}

/** `1 day`, `2.5 days` */
export function formatDays(days: number) {
  return days === 1 ? '1 day' : `${hoursFormat.format(days)} days`;
}
