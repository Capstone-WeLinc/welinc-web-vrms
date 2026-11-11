import { useState, type RefObject } from 'react';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActivityRows, ActivityRowsSkeleton, ActivityShowMore } from '../../../components/activity/ActivityRows';
import { EmptyState } from '../../../components/shared/EmptyState';
import { ErrorState } from '../../../components/shared/ErrorState';
import { ResponsiveDialog } from '../../../components/shared/ResponsiveDialog';
import { useActivityFeed } from '../../../hooks/useActivityFeed';
import { getUserActivity, type ActivityCategory } from '../../../lib/api/activityApi';
import type { ManagedUser } from '../../../types';

interface UserActivityDialogProps {
  user: ManagedUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finalFocusRef?: RefObject<HTMLElement | null>;
}

const PAGE_SIZE = 20;

/** The chips, in the catalog's order; the catalog's labels replace these once it loads. */
const CATEGORIES: { code: ActivityCategory; label: string }[] = [
  { code: 'SIGN_IN', label: 'Sign in' },
  { code: 'SESSION', label: 'Sessions' },
  { code: 'CODE', label: 'Email codes' },
  { code: 'ACCOUNT', label: 'Account changes' },
];

/**
 * One person's activity for an admin (spec 0011, AC-20): their VRMS events and their account wide
 * ones (sign ins, codes, password), newest first, with category chips and Show more. Each row
 * names the admin who acted.
 */
export function UserActivityDialog({ user, open, onOpenChange, finalFocusRef }: UserActivityDialogProps) {
  const [chosen, setChosen] = useState<ActivityCategory[]>([]);
  const userId = user?.id ?? '';
  const { state, labels, reload, loadMore } = useActivityFeed(
    (cursor) => getUserActivity(userId, { cursor, limit: PAGE_SIZE, category: chosen }),
    `${userId}|${chosen.join(',')}`,
    open && userId !== '',
  );
  const chips = labels.catalog?.categories ?? CATEGORIES;

  const toggle = (code: ActivityCategory) =>
    setChosen((current) => (current.includes(code) ? current.filter((c) => c !== code) : [...current, code]));

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      finalFocusRef={finalFocusRef}
      title={user ? `${user.name}’s activity` : 'Activity'}
      description="Sign ins, sessions, codes and account changes in VRMS and across their WeLinc account."
      footer={
        <Button type="button" variant="outline" size="touch" className="md:h-10 md:text-sm" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div role="group" aria-label="Show only" className="flex flex-wrap gap-2">
          {chips.map((chip) => {
            const on = chosen.includes(chip.code);
            return (
              <button
                key={chip.code}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(chip.code)}
                className={`h-9 rounded-full border px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-accent'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
        {state.status === 'loading' && <ActivityRowsSkeleton />}
        {state.status === 'error' && <ErrorState title="We couldn’t load the activity" message={state.message} onRetry={reload} />}
        {state.status === 'ready' && state.events.length === 0 && (
          <EmptyState
            icon={History}
            title={chosen.length > 0 ? 'Nothing of that kind' : 'No activity yet'}
            description={chosen.length > 0 ? 'Turn a chip off to see more.' : 'Their sign ins and account changes will show here.'}
          />
        )}
        {state.status === 'ready' && state.events.length > 0 && (
          <>
            <ActivityRows events={state.events} labels={labels} viewer="admin" />
            <ActivityShowMore hasMore={state.nextCursor !== null} loading={state.loadingMore} error={state.moreError} onMore={loadMore} />
          </>
        )}
      </div>
    </ResponsiveDialog>
  );
}
