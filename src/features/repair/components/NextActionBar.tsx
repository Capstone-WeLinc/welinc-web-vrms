import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NextActionBarProps {
  label: string;
  /** Return to mechanic, as a second button beneath the primary one (spec 0014, AC-15; spec 0018, AC-15). */
  secondaryLabel?: string | null;
  /** Mechanics have the bottom tab bar below 768px; the bar sits on top of it. */
  aboveTabBar: boolean;
  /** Why the primary button is disabled (spec 0015, AC-5). */
  blockedReason?: string | null;
  onAction: () => void;
  onSecondary?: () => void;
}

/**
 * The next action within thumb reach below 1024px (spec 0004, AC-20). It spans the full width
 * under the sidebar (z-40) and the tab bar (z-40); from 768px the buttons sit on the right,
 * clear of either sidebar width. The page adds matching bottom padding.
 */
export function NextActionBar({ label, secondaryLabel, aboveTabBar, blockedReason, onAction, onSecondary }: NextActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-safe lg:hidden">
      {/* DOM order is reading order (primary, then Return to mechanic); from 768px they sit side by side on the right */}
      <div className={cn('flex flex-col gap-2 p-3 md:flex-row md:justify-end md:px-8', aboveTabBar && 'mb-16 md:mb-0')}>
        {blockedReason && (
          <p id="bar-blocked" className="text-sm text-muted-foreground md:order-first md:self-center">
            {blockedReason}
          </p>
        )}
        <Button
          size="touch"
          className="w-full md:w-auto"
          onClick={onAction}
          disabled={!!blockedReason}
          aria-describedby={blockedReason ? 'bar-blocked' : undefined}
        >
          {label}
        </Button>
        {secondaryLabel && (
          <Button variant="outline" size="touch" className="w-full md:w-auto" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
