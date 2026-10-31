import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, LayoutDashboard, ShieldCheck, Wrench } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { ErrorState } from '../../../components/shared/ErrorState';
import { useAuthStore } from '../../../store/authStore';
import { dueLabel, isOverdue } from '../../../lib/utils/due';
import { useDashboardData } from '../hooks/useDashboardData';
import {
  attentionDueLabel,
  attentionList,
  greeting,
  mechanicWorkList,
  pipelineCounts,
  verificationQueue,
} from '../lib/attention';
import { AttentionTiles, type AttentionTile } from './AttentionTiles';
import { DashboardSkeleton } from './DashboardSkeleton';
import { LastUpdated } from './LastUpdated';
import { RepairProgressChart } from './RepairProgressChart';
import { TicketAttentionTable } from './TicketAttentionTable';
import { TruncationNote } from './TruncationNote';
import { VerificationQueueTable } from './VerificationQueueTable';

const SECTION_LIMIT = 8;

// Spec 0015: the Chief Mechanic's view. Sign off queue first, then own work, attention, pipeline. No spend.
export function ChiefDashboard() {
  const user = useAuthStore((state) => state.user);
  const { active, history, fetchedAt, state, errorMessage, refreshFailed, truncated, retry } = useDashboardData({
    includeHistory: true,
  });

  const derived = useMemo(() => {
    const queue = verificationQueue(active);
    const work = mechanicWorkList(
      active.filter((t) => t.can.work),
      fetchedAt,
    );
    const overdue = active.filter((t) => isOverdue(t, fetchedAt)).length;
    const queued = new Set(queue.map((t) => t.id));
    const tiles: AttentionTile[] = [
      { caption: 'Waiting for you', value: queue.length, icon: ShieldCheck },
      { caption: 'My open work', value: work.length, icon: Wrench },
      { caption: 'Overdue', value: overdue, icon: AlertTriangle, tone: overdue > 0 ? 'destructive' : 'default' },
      { caption: 'Open', value: active.length, icon: ClipboardList },
    ];
    return {
      tiles,
      queue: queue.slice(0, SECTION_LIMIT),
      work,
      // AC-18: every queued ticket leaves this list, not just the 8 shown above
      attention: attentionList(active, fetchedAt, Infinity)
        .filter((t) => !queued.has(t.id))
        .slice(0, SECTION_LIMIT),
      pipeline: pipelineCounts(active, history, fetchedAt),
      rowCount: active.length + history.length,
    };
  }, [active, history, fetchedAt]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`${greeting(user?.name)} Here's what is waiting for you.`}
        icon={LayoutDashboard}
      />

      {state === 'loading' && <DashboardSkeleton admin={false} />}

      {state === 'error' && (
        <ErrorState
          title="We couldn’t load the dashboard"
          message={errorMessage ?? 'The dashboard didn’t load.'}
          onRetry={retry}
        />
      )}

      {state === 'ready' && (
        <div className="flex flex-col gap-6">
          <LastUpdated fetchedAt={fetchedAt} refreshFailed={refreshFailed} />

          <div className="flex flex-col gap-3">
            <AttentionTiles tiles={derived.tiles} />
            {truncated && <TruncationNote rows={derived.rowCount} />}
          </div>

          <section aria-labelledby="sign-off-heading" className="flex flex-col gap-3">
            <div>
              <h2 id="sign-off-heading" className="text-lg font-semibold text-foreground">
                Waiting for your sign off
              </h2>
              <p className="text-sm text-muted-foreground">Oldest first.</p>
            </div>
            <VerificationQueueTable rows={derived.queue} now={fetchedAt} />
          </section>

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
              empty={{ title: 'Nothing assigned to you' }}
            />
          </section>

          <section aria-labelledby="needs-attention-heading" className="flex flex-col gap-3">
            <div>
              <h2 id="needs-attention-heading" className="text-lg font-semibold text-foreground">
                Needs attention
              </h2>
              <p className="text-sm text-muted-foreground">
                Across every garage: overdue first, then tickets with no active mechanic, then your own tickets waiting
                for someone else to sign off.
              </p>
            </div>
            <TicketAttentionTable
              rows={derived.attention}
              dueLabel={(t) => attentionDueLabel(t, fetchedAt)}
              label="Tickets that need attention"
              empty={{
                title: 'Nothing else needs attention',
                description: 'No overdue tickets and none without a mechanic.',
                icon: CheckCircle2,
              }}
            />
          </section>

          <RepairProgressChart counts={derived.pipeline} />
        </div>
      )}
    </div>
  );
}
