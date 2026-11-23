import { cn } from '@/lib/utils';

// design.md "Plate chip": the truck's plate, the one product signature. Neutral on purpose,
// so it never competes with status or priority colors.
export function PlateChip({ plate, className }: { plate: string; className?: string }) {
  return (
    <span
      translate="no"
      className={cn(
        'inline-flex h-6 shrink-0 items-center rounded-sm border border-input bg-card px-2 font-mono text-body font-semibold whitespace-nowrap text-foreground uppercase',
        className,
      )}
    >
      {plate}
    </span>
  );
}
