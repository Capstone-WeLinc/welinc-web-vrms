// Priority colors. PriorityBadge uses PRIORITY_MAP; the repair form's priority
// toggle uses PRIORITY_TOGGLE_ON, the same colors on its selected item.

const ROUTINE = 'bg-secondary text-muted-strong';

export const PRIORITY_MAP: Record<string, { label: string; className: string }> = {
  CRITICAL: { label: 'Critical', className: 'bg-destructive text-destructive-foreground' },
  HIGH: { label: 'High', className: 'bg-highlight text-highlight-foreground' },
  MEDIUM: { label: 'Medium', className: ROUTINE },
  LOW: { label: 'Low', className: ROUTINE },
};

// Written out in full so Tailwind finds every class. Routine levels add a border, since their fill is light.
const ROUTINE_ON = 'data-[state=on]:border-foreground data-[state=on]:bg-secondary data-[state=on]:text-foreground';

export const PRIORITY_TOGGLE_ON: Record<string, string> = {
  CRITICAL: 'data-[state=on]:border-destructive data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground',
  HIGH: 'data-[state=on]:border-highlight data-[state=on]:bg-highlight data-[state=on]:text-highlight-foreground',
  MEDIUM: ROUTINE_ON,
  LOW: ROUTINE_ON,
};
