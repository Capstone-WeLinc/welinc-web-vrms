import { BadgePill } from './BadgePill';
import { PRIORITY_MAP } from './priorityStyles';

interface PriorityBadgeProps {
  /** A PriorityLevel from src/types. */
  priority: string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const meta = PRIORITY_MAP[priority] ?? { label: priority, className: 'bg-status-cancelled-bg text-status-cancelled-fg' };
  return <BadgePill className={meta.className}>{meta.label}</BadgePill>;
}
