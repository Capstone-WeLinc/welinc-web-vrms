import { useMemo } from 'react';
import { AlertTriangle, Clock, LayoutDashboard, ShieldCheck, Wrench } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { ErrorState } from '../../../components/shared/ErrorState';
import { useAuthStore } from '../../../store/authStore';
import { useDashboardData } from '../hooks/useDashboardData';
import { countMechanicOverdue, greeting, isWaiting, mechanicWorkList } from '../lib/attention';
import { dueLabel } from '../../../lib/utils/due';
import { AttentionTiles, type AttentionTile } from './AttentionTiles';
import { DashboardSkeleton } from './DashboardSkeleton';
import { LastUpdated } from './LastUpdated';
import { TicketAttentionTable } from './TicketAttentionTable';
import { TruncationNote } from './TruncationNote';

export function MechanicDashboard() {
  const user = useAuthStore((state) => state.user);
  const { active, fetchedAt, state, errorMessage, refreshFailed, truncated, retry } = useDashboardData({
    includeHistory: false,
  });

  const derived = useMemo(() => {
    // Overdue counts only ASSIGNED and IN_PROGRESS, so the tile matches the overdue rows in the list.
    const overdue = countMechanicOverdue(active, fetchedAt);
    const tiles: AttentionTile[] = [
      { caption: 'To start', value: active.filter((t) => t.status === 'ASSIGNED').length, icon: Clock },
      { caption: 'In progress', value: active.filter((t) => t.status === 'IN_PROGRESS').length, icon: Wrench },
      { caption: 'Overdue', value: overdue, icon: AlertTriangle, tone: overdue > 0 ? 'destructive' : 'default' },
      { caption: 'Waiting for sign off', value: active.filter(isWaiting).length, icon: ShieldCheck },
    ];
    return { tiles, work: mechanicWorkList(active, fetchedAt) };
  }, [active, fetchedAt]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`${greeting(user?.name)} Here's your work, most urgent first.`}
        icon={LayoutDashboard}
      />

      {state === 'loading' && <DashboardSkeleton admin={false} />}

      {state === 'error' && (
        <ErrorState
          title="We couldn’t load your repairs"
          message={errorMessage ?? 'The dashboard didn’t load.'}
          onRetry={retry}
        />
      )}

      {state === 'ready' && (
        <div className="flex flex-col gap-6">
          <LastUpdated fetchedAt={fetchedAt} refreshFailed={refreshFailed} />

          <div className="flex flex-col gap-3">
            <AttentionTiles tiles={derived.tiles} />
            {truncated && <TruncationNote rows={active.length} />}
          </div>

          <section aria-labelledby="my-work-heading" className="flex flex-col gap-3">
            <div>
              <h2 id="my-work-heading" className="text-lg font-semibold text-foreground">
                My work
              </h2>
              <p className="text-sm text-muted-foreground">Overdue first, then by due date.</p>
            </div>
            <TicketAttentionTable
              rows={derived.work}
              dueLabel={(t) => dueLabel(t, fetchedAt)}
              label="My active tickets"
              empty={{ title: 'No active repairs assigned to you right now.' }}
            />
          </section>
        </div>
      )}
    </div>
  );
}
