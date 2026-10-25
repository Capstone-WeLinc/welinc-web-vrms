import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EditorActionsProps {
  isNew: boolean;
  /** Which save is running, so only its button spins. */
  saving: 'DRAFT' | 'ACTIVE' | 'EDIT' | null;
  onCancel: () => void;
  onSave: (intent: 'DRAFT' | 'ACTIVE' | 'EDIT') => void;
  /** Everyone but admins has the bottom tab bar below 768px; the bar sits on top of it. */
  aboveTabBar: boolean;
}

// Narrower padding below 768px, so three buttons fit side by side at 375px.
const SIZE = 'min-w-0 flex-1 px-3 md:flex-none md:px-5 lg:h-10 lg:text-sm';

function Actions({ isNew, saving, onCancel, onSave, className }: Omit<EditorActionsProps, 'aboveTabBar'> & { className?: string }) {
  const busy = saving !== null;
  return (
    <div className={cn('flex gap-3 md:justify-end', className)}>
      <Button type="button" variant="outline" size="touch" className={SIZE} disabled={busy} onClick={onCancel}>
        Cancel
      </Button>
      {isNew ? (
        <>
          <Button type="button" variant="secondary" size="touch" className={SIZE} disabled={busy} loading={saving === 'DRAFT'} onClick={() => onSave('DRAFT')}>
            Save as draft
          </Button>
          <Button type="button" size="touch" className={SIZE} disabled={busy} loading={saving === 'ACTIVE'} onClick={() => onSave('ACTIVE')}>
            Publish
          </Button>
        </>
      ) : (
        <Button type="button" size="touch" className={SIZE} disabled={busy} loading={saving === 'EDIT'} onClick={() => onSave('EDIT')}>
          Save changes
        </Button>
      )}
    </div>
  );
}

/** A bar fixed to the bottom below 1024px, inline at the end of the form from 1024px (AC-19). */
export function EditorActions({ aboveTabBar, ...props }: EditorActionsProps) {
  return (
    <>
      <Actions {...props} className="hidden lg:flex" />
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-safe lg:hidden">
        <Actions {...props} className={cn('p-3 md:px-8', aboveTabBar && 'mb-16 md:mb-0')} />
      </div>
    </>
  );
}
