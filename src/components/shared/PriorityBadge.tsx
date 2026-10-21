import { BadgePill } from './BadgePill';

interface PriorityBadgeProps {
  /** A PriorityLevel from src/types. */
  priority: string;
}

const ROUTINE = 'bg-secondary text-muted-strong';

const PRIORITY_MAP: Record<string, { label: string; className: string }> = {
  CRITICAL: { label: 'Critical', className: 'bg-destructive text-destructive-foreground' },
  HIGH: { label: 'High', className: 'bg-highlight text-highlight-foreground' },
  MEDIUM: { label: 'Medium', className: ROUTINE },
  LOW: { label: 'Low', className: ROUTINE },
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const meta = PRIORITY_MAP[priority] ?? { label: priority, className: 'bg-status-cancelled-bg text-status-cancelled-fg' };
  return <BadgePill className={meta.className}>{meta.label}</BadgePill>;
}
