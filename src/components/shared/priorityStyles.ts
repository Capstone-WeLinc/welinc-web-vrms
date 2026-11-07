// Priority badge colors (PriorityBadge). A priority picker does not reuse them for its
// selected item: design.md gives every toggle the one navy selected style, and the
// picker shows the priority color as a dot (PRIORITY_DOT).

const ROUTINE = 'bg-secondary text-muted-strong';

export const PRIORITY_MAP: Record<string, { label: string; className: string }> = {
  CRITICAL: { label: 'Critical', className: 'bg-destructive text-destructive-foreground' },
  HIGH: { label: 'High', className: 'bg-highlight/25 text-highlight-foreground' },
  MEDIUM: { label: 'Medium', className: ROUTINE },
  LOW: { label: 'Low', className: ROUTINE },
};

// The dot beside each priority option. Routine levels get a ring so the dot shows on white
// and on the navy selected fill.
const ROUTINE_DOT = 'bg-card ring-1 ring-input';

export const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-destructive',
  HIGH: 'bg-highlight',
  MEDIUM: ROUTINE_DOT,
  LOW: ROUTINE_DOT,
};
