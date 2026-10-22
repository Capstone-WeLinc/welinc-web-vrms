import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NextActionBarProps {
  label: string;
  /** Mechanics have the bottom tab bar below 768px; the bar sits on top of it. */
  aboveTabBar: boolean;
  onAction: () => void;
}

/**
 * The next action within thumb reach below 1024px (spec 0004, AC-20). It spans the full width
 * under the sidebar (z-40) and the tab bar (z-40); from 768px the button sits on the right,
 * clear of either sidebar width. The page adds matching bottom padding.
 */
export function NextActionBar({ label, aboveTabBar, onAction }: NextActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-safe lg:hidden">
      <div className={cn('flex p-3 md:justify-end md:px-8', aboveTabBar && 'mb-16 md:mb-0')}>
        <Button size="touch" className="w-full md:w-auto" onClick={onAction}>
          {label}
        </Button>
      </div>
    </div>
  );
}
