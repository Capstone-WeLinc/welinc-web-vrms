import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { ErrorState } from '../../../components/shared/ErrorState';
import { useAuthStore } from '../../../store/authStore';
import { useDashboardData } from '../hooks/useDashboardData';
import {
  attentionDueLabel,
  attentionList,
  completedThisMonth,
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
  const { active, history, fetchedAt, state, errorMessage, refreshFailed, truncated, retry } = useDashboardData({
    includeHistory: true,
  });

  const derived = useMemo(() => {
    const all = [...active, ...history];
    const overdue = active.filter((t) => isOverdue(t, fetchedAt)).length;
    const tiles: AttentionTile[] = [
      { caption: 'Open', value: active.length, icon: ClipboardList },
      { caption: 'Overdue', value: overdue, icon: AlertTriangle, tone: overdue > 0 ? 'destructive' : 'default' },
      { caption: 'Waiting for sign off', value: active.filter(isWaiting).length, icon: ShieldCheck },
      { caption: 'Done this month', value: completedThisMonth(history, fetchedAt), icon: CheckCircle2, tone: 'success' },
    ];
    return {
      all,
      tiles,
      attention: attentionList(active, fetchedAt, ATTENTION_LIMIT),
      pipeline: pipelineCounts(active, history, fetchedAt),
    };
  }, [active, history, fetchedAt]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`${greeting(user?.name)} Here's what needs your attention.`}
        icon={LayoutDashboard}
      />

      {state === 'loading' && <DashboardSkeleton admin />}

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
            {truncated && <TruncationNote rows={derived.all.length} />}
          </div>

          <section aria-labelledby="needs-attention-heading" className="flex flex-col gap-3">
            <div>
              <h2 id="needs-attention-heading" className="text-lg font-semibold text-foreground">
                Needs attention
              </h2>
              <p className="text-sm text-muted-foreground">Overdue first, then tickets waiting for your sign off.</p>
            </div>
            <TicketAttentionTable
              rows={derived.attention}
              dueLabel={(t) => attentionDueLabel(t, fetchedAt)}
              label="Tickets that need attention"
              empty={{
                title: 'Nothing needs your attention',
                description: 'No overdue tickets and nothing waiting for sign off.',
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
