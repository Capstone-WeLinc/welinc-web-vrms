import { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useCan } from '../../../lib/permissions/usePermissions';
import { PageHeader } from '../../../components/layout/PageHeader';
import { ErrorState } from '../../../components/shared/ErrorState';
import { useAuthStore } from '../../../store/authStore';
import { useDashboardData } from '../hooks/useDashboardData';
import {
  attentionDueLabel,
  attentionList,
  closedThisMonth,
  greeting,
  isWaiting,
  pipelineCounts,
} from '../lib/attention';
import { isOverdue } from '../../../lib/utils/due';
import { AttentionTiles, type AttentionTile } from './AttentionTiles';
import { DashboardSkeleton } from './DashboardSkeleton';
import { LastUpdated } from './LastUpdated';
import { RepairProgressChart } from './RepairProgressChart';
import { SpendSection } from './SpendSection';
import { TicketAttentionTable } from './TicketAttentionTable';
import { TruncationNote } from './TruncationNote';

const ATTENTION_LIMIT = 8;

export function AdminDashboard() {
  const user = useAuthStore((state) => state.user);
  const canVerify = useCan('ticket.verify');
  const { active, history, fetchedAt, state, errorMessage, refreshFailed, truncated, retry } = useDashboardData({
    includeHistory: true,
  });

  const derived = useMemo(() => {
    const all = [...active, ...history];
    const overdue = active.filter((t) => isOverdue(t, fetchedAt)).length;
    const tiles: AttentionTile[] = [
      { caption: 'Open', value: active.length, href: '/repairs' },
      { caption: 'Overdue', value: overdue, href: '/repairs?overdue=1' },
      // Hot for the roles that sign off (docs/context/vrms/design.md, Hot counts)
      { caption: 'Waiting for sign off', value: active.filter(isWaiting).length, href: '/repairs?status=FOR_VERIFICATION', hot: canVerify },
      { caption: 'Done this month', value: closedThisMonth(history, fetchedAt), href: '/history' },
    ];
    return {
      all,
      tiles,
      attention: attentionList(active, fetchedAt, ATTENTION_LIMIT),
      pipeline: pipelineCounts(active, history, fetchedAt),
    };
  }, [active, history, fetchedAt, canVerify]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        context={`${greeting(user?.name)} Here's what needs your attention.`}
      />

      {state === 'loading' && <DashboardSkeleton admin />}

      {state === 'error' && (
        <ErrorState
          kind="page"
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
            {truncated && <TruncationNote rows={derived.all.length} />}
          </div>

          <section aria-labelledby="needs-attention-heading" className="flex flex-col gap-3">
            <div>
              <h2 id="needs-attention-heading" className="text-subheading font-semibold text-foreground">
                Needs attention
              </h2>
              <p className="text-body text-muted-foreground">Overdue first, then tickets with no active mechanic, then tickets waiting for your sign off.</p>
            </div>
            <TicketAttentionTable
              rows={derived.attention}
              dueLabel={(t) => attentionDueLabel(t, fetchedAt)}
              label="Tickets that need attention"
              empty={{
                title: 'Nothing needs your attention',
                description: 'No overdue tickets, none without a mechanic, and nothing waiting for sign off.',
                icon: CheckCircle2,
              }}
            />
          </section>

          <RepairProgressChart counts={derived.pipeline} />
          <SpendSection tickets={derived.all} now={fetchedAt} />
        </div>
      )}
    </div>
  );
}
