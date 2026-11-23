import { History } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityRows, ActivityRowsSkeleton, ActivityShowMore } from '../../../components/activity/ActivityRows';
import { EmptyState } from '../../../components/shared/EmptyState';
import { ErrorState } from '../../../components/shared/ErrorState';
import { useActivityFeed } from '../../../hooks/useActivityFeed';
import { getMyActivity } from '../../../lib/api/activityApi';

/** The card shows 10 at a time; Show more loads the next 10 in place (spec 0011, AC-19). */
const PAGE_SIZE = 10;

/**
 * Recent activity on My profile (spec 0011, AC-19): your sign ins, sessions, codes and account
 * changes from every WeLinc system, newest first, grouped by day.
 */
export function RecentActivityCard() {
  const { state, labels, reload, loadMore } = useActivityFeed((cursor) => getMyActivity({ cursor, limit: PAGE_SIZE }), 'me');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-group">Recent activity</CardTitle>
        <CardDescription>Sign ins, devices and changes to your account across WeLinc. If something wasn’t you, end that device above and change your password.</CardDescription>
      </CardHeader>
      <CardContent>
        {state.status === 'loading' && <ActivityRowsSkeleton />}
        {state.status === 'error' && <ErrorState title="We couldn’t load your activity" message={state.message} onRetry={reload} />}
        {state.status === 'ready' && state.events.length === 0 && (
          <EmptyState icon={History} title="No activity yet" description="Your sign ins and account changes will show here." />
        )}
        {state.status === 'ready' && state.events.length > 0 && (
          <div className="flex flex-col gap-4">
            <ActivityRows events={state.events} labels={labels} viewer="self" />
            <ActivityShowMore hasMore={state.nextCursor !== null} loading={state.loadingMore} error={state.moreError} onMore={loadMore} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
