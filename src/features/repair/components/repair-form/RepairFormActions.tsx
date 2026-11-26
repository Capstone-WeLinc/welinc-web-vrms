import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RepairFormActionsProps {
  saving: boolean;
  /** A required list failed or is empty, so the form can't be completed (AC-15). */
  listsBlocked: boolean;
  /** Says why the save is off when it isn't a list that failed (spec 0029: the referral). */
  blockedNote?: string;
  /** The truck already has an open ticket, so a second one is refused (spec 0016, AC-12). */
  openTicketBlocked?: boolean;
  onCancel: () => void;
}

const BLOCKED_NOTE = 'Some lists couldn’t load. Try again above before creating the ticket.';

function Actions({ saving, listsBlocked, blockedNote, openTicketBlocked = false, onCancel, className }: RepairFormActionsProps & { className?: string }) {
  const noteId = useId();
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {listsBlocked && (
        <p id={noteId} className="text-caption text-destructive md:text-right">
          {blockedNote ?? BLOCKED_NOTE}
        </p>
      )}
      {/* From 768px the bar runs under the sidebar, so the buttons keep to the right. */}
      <div className="flex gap-3 md:justify-end">
        <Button type="button" variant="outline" size="touch" className="flex-1 md:flex-none lg:h-10 lg:text-body" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="touch"
          className="flex-1 md:flex-none lg:h-10 lg:text-body"
          disabled={saving || listsBlocked || openTicketBlocked}
          aria-describedby={listsBlocked ? noteId : undefined}
        >
          Create ticket
        </Button>
      </div>
    </div>
  );
}

/**
 * Cancel and Create ticket (AC-16): a bar fixed to the bottom below 1024px, like NextActionBar, and
 * inline at the end of the form from 1024px. The page reserves room for the bar with pb-action-bar.
 */
export function RepairFormActions(props: RepairFormActionsProps) {
  return (
    <>
      <Actions {...props} className="hidden lg:flex" />
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-safe lg:hidden">
        <Actions {...props} className="p-3 md:px-8" />
      </div>
    </>
  );
}
